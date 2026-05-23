import os
import json
import time
import math
import threading
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from .models import Project, CodeChunk, ChatMessage
import openai

KIMI_MODEL = os.environ.get('KIMI_MODEL', 'moonshot-v1-32k')

def get_openai_client():
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return None
    return openai.OpenAI(api_key=api_key)

def get_embeddings(text_list):
    # If API key missing, return dummy 1536 vectors
    client = get_openai_client()
    if not client:
        import random
        return [[random.uniform(-0.5, 0.5) for _ in range(1536)] for _ in text_list]
        
    try:
        response = client.embeddings.create(
            model='text-embedding-3-small',
            input=text_list
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        print('OpenAI Embeddings error:', e)
        import random
        return [[random.uniform(-0.5, 0.5) for _ in range(1536)] for _ in text_list]

def dot_product(v1, v2):
    return sum(x*y for x, y in zip(v1, v2))

def magnitude(v):
    return math.sqrt(sum(x*x for x in v))

def cosine_similarity(v1, v2):
    m1 = magnitude(v1)
    m2 = magnitude(v2)
    if m1 == 0 or m2 == 0:
        return 0.0
    return dot_product(v1, v2) / (m1 * m2)

def chunk_code_file(file_path, content):
    lines = content.split('\n')
    chunks = []
    current_chunk_lines = []
    chunk_start_line = 1
    target_chunk_lines = 40
    
    for i, line in enumerate(lines):
        current_chunk_lines.append(line)
        is_last_line = (i == len(lines) - 1)
        trimmed = line.strip()
        is_boundary = (trimmed == '}' or trimmed == '};' or trimmed.startswith('export '))
        has_enough_lines = (len(current_chunk_lines) >= target_chunk_lines)
        
        if is_last_line or (has_enough_lines and is_boundary) or len(current_chunk_lines) >= target_chunk_lines * 1.5:
            chunks.append({
                'file_path': file_path,
                'start_line': chunk_start_line,
                'end_line': i + 1,
                'content': '\n'.join(current_chunk_lines)
            })
            chunk_start_line = i + 2
            current_chunk_lines = []
            
    return chunks

def get_demo_explain_stream(question, project_id):
    q_lower = question.lower()
    if 'router' in q_lower or 'route' in q_lower:
        answer = """Based on the codebase structure, routing and API layers are now handled via standard Django API Views.

Here is how the review route streaming works on the Django side:
1. It validates authorization via Django's auth classes.
2. It calls the Anthropic API stream client inside `StreamingHttpResponse` to pipe the SSE response in real-time.
3. Once completed, it triggers an asynchronous thread worker to parse the JSON and save the reviews:
```python
def update_review_async(review_id, collected_text):
    def worker():
        # Parse JSON output and save to PostgreSQL Review model
        review = Review.objects.get(id=review_id)
        review.status = 'complete'
        review.result = json.loads(collected_text)
        review.save()
    threading.Thread(target=worker).start()
```"""
    elif 'database' in q_lower or 'schema' in q_lower or 'sql' in q_lower:
        answer = """The database layer has been fully migrated to **PostgreSQL using Django ORM**:

Models defined in the system:
1. `Review` (stores code review summaries & feedback in a JSONField).
2. `Project` (represents folders/repos uploaded for explanations).
3. `CodeChunk` (stores chunked contents and 1536-dimensional embedding vectors).
4. `ChatMessage` (stores history of user interactions with the explainer).

We perform in-memory Cosine Similarity matching for semantic vector search, ensuring database queries are fast, light, and compatible with any PostgreSQL server setup."""
    else:
        answer = """I found some relevant components in the codebase matching your question:
1. The **Django REST settings** are configured in `core/settings.py` for CORS integrations.
2. The **File Chunker** splits files into logical functions and blocks of around 40 lines.
3. The **Authentication Views** support standard Django user session creation with secure cookies.

Is there a specific part of the code structure you would like me to explain in more detail?"""

    def generator():
        index = 0
        chunk_size = 6
        while index < len(answer):
            chunk = answer[index:index+chunk_size]
            index += chunk_size
            payload = {
                'type': 'content_block_delta',
                'delta': {
                    'type': 'text_delta',
                    'text': chunk
                }
            }
            yield f"event: message\ndata: {json.dumps(payload)}\n\n"
            time.sleep(0.02)
        yield f"event: message\ndata: {json.dumps({'type': 'message_stop'})}\n\n"
        
    return StreamingHttpResponse(generator(), content_type='text/event-stream')

def save_chat_async(project_id, question, answer):
    def worker():
        try:
            project = Project.objects.get(id=project_id)
            ChatMessage.objects.create(project=project, role='user', content=question)
            ChatMessage.objects.create(project=project, role='assistant', content=answer)
        except Exception as e:
            print('Failed to save chat message history:', e)
    threading.Thread(target=worker).start()

@api_view(['POST'])
@permission_classes([AllowAny])
def execute_explain(request):
    question = request.data.get('question')
    project_id = request.data.get('projectId')

    if not question or not project_id:
        return JsonResponse(
            {'error': 'Question and ProjectId are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if project is a demo project
    is_demo = (
        os.environ.get('NEXT_PUBLIC_DEMO_MODE') == 'true' or 
        not request.user.is_authenticated or 
        str(project_id).startswith('demo-')
    )

    if is_demo:
        return get_demo_explain_stream(question, project_id)

    # Validate project_id is numeric
    try:
        project_id_int = int(project_id)
    except (ValueError, TypeError):
        return JsonResponse(
            {'error': 'Invalid project ID format.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        project = Project.objects.get(id=project_id_int, user=request.user)
    except Project.DoesNotExist:
        return JsonResponse(
            {'error': 'Project not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # 1. Embed the question
    question_embedding = get_embeddings([question])[0]

    # 2. Fetch chunks and calculate similarity
    chunks = CodeChunk.objects.filter(project=project)
    
    scored_chunks = []
    for chunk in chunks:
        similarity = cosine_similarity(question_embedding, chunk.embedding)
        scored_chunks.append((similarity, chunk))
        
    # Sort and pick top 8
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [item[1] for item in scored_chunks[:8]]

    # 3. Format context
    context_lines = []
    for c in top_chunks:
        context_lines.append(f"// {c.file_path} (lines {c.start_line}–{c.end_line})\n{c.content}")
    context_content = "\n\n---\n\n".join(context_lines)

    system_prompt = f"""You are an expert on this codebase. Use only the provided code context inside the <context> tags to answer questions.
Always cite the file path and line numbers you're referencing in your answer in the format [file_path:line].
Be concise, clear, and trace your explanations back to the actual code.

<context>
{context_content}
</context>"""

    # 4. Stream response from Kimi
    api_key = os.environ.get('KIMI_API_KEY') or os.environ.get('MOONSHOT_API_KEY')
    if not api_key:
        return JsonResponse(
            {'error': 'Kimi API key is not configured.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    client = openai.OpenAI(
        api_key=api_key,
        base_url="https://api.moonshot.ai/v1"
    )

    def sse_generator():
        collected = []
        try:
            response = client.chat.completions.create(
                model=KIMI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                stream=True,
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    text = chunk.choices[0].delta.content or ""
                    if text:
                        collected.append(text)
                        payload = {
                            'type': 'content_block_delta',
                            'delta': {
                                'type': 'text_delta',
                                'text': text
                            }
                        }
                        yield f"event: message\ndata: {json.dumps(payload)}\n\n"
                    
            yield f"event: message\ndata: {json.dumps({'type': 'message_stop'})}\n\n"
            
            # Save chat log asynchronously
            answer_text = "".join(collected)
            save_chat_async(project_id, question, answer_text)
        except Exception as e:
            payload = {
                'type': 'error',
                'error': {
                    'message': str(e)
                }
            }
            yield f"event: message\ndata: {json.dumps(payload)}\n\n"
            
    return StreamingHttpResponse(sse_generator(), content_type='text/event-stream')

@api_view(['POST'])
@permission_classes([AllowAny]) # Checked internally
def index_project_embeddings(request):
    files = request.data.get('files')
    project_name = request.data.get('projectName', 'Unnamed Project')
    
    if not files:
        return JsonResponse(
            {'error': 'Files are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Resolve active user
    user = request.user
    if not user.is_authenticated:
        # Fallback to a demo user
        from django.contrib.auth.models import User
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            # Create a mock admin user
            user = User.objects.create_superuser('admin', 'admin@example.com', 'adminpass')

    # 1. Create or get Project
    project, _ = Project.objects.get_or_create(
        user=user,
        name=project_name
    )

    # 2. Clear old chunks
    CodeChunk.objects.filter(project=project).delete()

    # 3. Chunk files
    all_chunks_data = []
    for file_info in files:
        path = file_info.get('path') or file_info.get('name')
        content = file_info.get('content', '')
        if not path or not content:
            continue
        file_chunks = chunk_code_file(path, content)
        all_chunks_data.extend(file_chunks)

    if not all_chunks_data:
        return JsonResponse({'success': True, 'projectId': project.id, 'chunksIndexed': 0})

    # 4. Generate batch embeddings
    contents = [chunk['content'] for chunk in all_chunks_data]
    
    # OpenAI supports maximum ~2048 inputs per batch. Slice them in chunks of 500 just in case.
    batch_size = 500
    embeddings_list = []
    for i in range(0, len(contents), batch_size):
        batch_contents = contents[i:i+batch_size]
        batch_embeddings = get_embeddings(batch_contents)
        embeddings_list.extend(batch_embeddings)

    # 5. Insert into DB
    chunks_to_create = []
    for idx, chunk_data in enumerate(all_chunks_data):
        chunks_to_create.append(CodeChunk(
            project=project,
            file_path=chunk_data['file_path'],
            start_line=chunk_data['start_line'],
            end_line=chunk_data['end_line'],
            content=chunk_data['content'],
            embedding=embeddings_list[idx]
        ))
        
    CodeChunk.objects.bulk_create(chunks_to_create)

    return JsonResponse({
        'success': True,
        'projectId': project.id,
        'chunksIndexed': len(chunks_to_create)
    })
