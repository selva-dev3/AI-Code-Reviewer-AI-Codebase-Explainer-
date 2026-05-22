import os
import json
import time
import threading
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from .models import Review
import anthropic

CLAUDE_MODEL = 'claude-3-5-sonnet-20241022'
REVIEW_SYSTEM_PROMPT = """You are a senior software engineer conducting a thorough code review.
Analyse the provided code and respond with a JSON array of review items.
Each item must have:
  - "type": "bug" | "suggestion" | "style"
  - "severity": "critical" | "major" | "minor"
  - "line": <line number or null>
  - "message": <concise explanation>
  - "fix": <code snippet or null>

Respond ONLY with the JSON array. No preamble. No markdown fences."""

def get_demo_stream(code, language, review_id):
    # Simulated review generation
    lines = code.split('\n')
    any_line = next((i + 1 for i, l in enumerate(lines) if 'any' in l), 2)
    fetch_line = next((i + 1 for i, l in enumerate(lines) if 'fetch' in l), 5)
    
    mock_reviews = [
        {
            'type': 'bug',
            'severity': 'critical',
            'line': any_line,
            'message': 'Explicit use of "any" type detected. This bypasses TypeScript\'s type checking safety and can lead to runtime errors.',
            'fix': '// Use a strict type, generic, or unknown with a type guard\nfunction processData(data: unknown) {\n  if (typeof data === "string") {\n    return data.trim();\n  }\n}'
        },
        {
            'type': 'suggestion',
            'severity': 'major',
            'line': fetch_line,
            'message': 'API request is not wrapped in a try/catch block. Expected failures (e.g. network timeout) should be gracefully handled.',
            'fix': 'try {\n  const response = await fetch(url);\n  return { data: await response.json(), error: null };\n} catch (error) {\n  console.error("Fetch failed:", error);\n  return { data: null, error };\n}'
        },
        {
            'type': 'style',
            'severity': 'minor',
            'line': min(8, len(lines)),
            'message': 'Function name is generic. Use a more descriptive verb-noun naming scheme to represent its functional scope.',
            'fix': 'function executeCodeReviewRequest() {\n  // ...\n}'
        }
    ]

    mock_json = json.dumps(mock_reviews, indent=2)
    
    def generator():
        index = 0
        chunk_size = 8
        while index < len(mock_json):
            chunk = mock_json[index:index+chunk_size]
            index += chunk_size
            payload = {
                'type': 'content_block_delta',
                'delta': {
                    'type': 'text_delta',
                    'text': chunk
                }
            }
            yield f"event: message\ndata: {json.dumps(payload)}\n\n"
            time.sleep(0.03)
        yield f"event: message\ndata: {json.dumps({'type': 'message_stop'})}\n\n"
        
    return StreamingHttpResponse(generator(), content_type='text/event-stream')

def update_review_async(review_id, collected_text):
    def worker():
        try:
            # Parse and validate the response
            parsed_result = []
            try:
                # Remove markdown code block markers if present
                clean_text = collected_text.strip()
                if clean_text.startswith('```'):
                    # Strip leading and trailing block lines
                    lines = clean_text.split('\n')
                    if lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines and lines[-1].startswith('```'):
                        lines = lines[:-1]
                    clean_text = '\n'.join(lines)
                parsed_result = json.loads(clean_text)
            except Exception as e:
                print('Failed to parse final Claude response as JSON:', e)
                
            review = Review.objects.get(id=review_id)
            review.status = 'complete'
            review.result = parsed_result
            review.save()
        except Exception as e:
            print('Error updating review row on stream end:', e)
            
    threading.Thread(target=worker).start()

@api_view(['POST'])
@permission_classes([AllowAny]) # Checked inside endpoint
def execute_review(request):
    is_demo = os.environ.get('NEXT_PUBLIC_DEMO_MODE') == 'true' or not request.user.is_authenticated

    code = request.data.get('code')
    language = request.data.get('language')

    if not code or not language:
        return JsonResponse(
            {'error': 'Code and Language are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Create a review record if in production
    review_id = f"demo-review-{int(time.time())}"
    storage_path = 'demo-path'
    
    if not is_demo:
        # Save raw code file locally
        user_dir = os.path.join('media', 'code-files', str(request.user.id))
        os.makedirs(user_dir, exist_ok=True)
        file_name = f"{int(time.time())}.txt"
        file_path = os.path.join(user_dir, file_name)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code)
            
        storage_path = file_path
        
        review = Review.objects.create(
            user=request.user,
            language=language,
            storage_path=storage_path,
            status='pending'
        )
        review_id = review.id

    # 2. Return SSE Demo Stream
    if is_demo:
        return get_demo_stream(code, language, review_id)

    # 3. Call Claude and Stream back
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return JsonResponse(
            {'error': 'Anthropic API key is not configured.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    client = anthropic.Anthropic(api_key=api_key)

    def sse_generator():
        collected_chunks = []
        try:
            with client.messages.stream(
                model=CLAUDE_MODEL,
                max_tokens=4096,
                system=REVIEW_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": f"Language: {language}\nCode:\n{code}"}],
            ) as stream:
                for text in stream.text_stream:
                    collected_chunks.append(text)
                    payload = {
                        'type': 'content_block_delta',
                        'delta': {
                            'type': 'text_delta',
                            'text': text
                        }
                    }
                    yield f"event: message\ndata: {json.dumps(payload)}\n\n"
                    
            yield f"event: message\ndata: {json.dumps({'type': 'message_stop'})}\n\n"
            
            # Save completed text asynchronously
            full_text = "".join(collected_chunks)
            update_review_async(review_id, full_text)
            
        except Exception as e:
            payload = {
                'type': 'error',
                'error': {
                    'message': str(e)
                }
            }
            yield f"event: message\ndata: {json.dumps(payload)}\n\n"
            
    return StreamingHttpResponse(sse_generator(), content_type='text/event-stream')
