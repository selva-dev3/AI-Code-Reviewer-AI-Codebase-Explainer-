import os
import json
import time
import threading
from django.http import StreamingHttpResponse, JsonResponse
from django.utils import timezone
from django.utils.timesince import timesince
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from .models import Review
from explainer.models import Project
import openai

KIMI_MODEL = os.environ.get('KIMI_MODEL', 'moonshot-v1-32k')


def _get_user_or_demo(request):
    """Resolve the current user, or fallback to demo user if in demo mode."""
    if request.user.is_authenticated:
        return request.user
    # Try demo user
    demo = User.objects.filter(username='demo@aireviewer.dev').first()
    if demo:
        return demo
    # Fallback to first superuser or any user
    return User.objects.first()


def _calculate_quality_index(total_reviews, critical_count, major_count):
    """Calculate a quality index letter grade from review stats."""
    if total_reviews == 0:
        return 'N/A'
    bug_ratio = (critical_count * 3 + major_count) / max(total_reviews, 1)
    if bug_ratio <= 0.2:
        return 'A+'
    elif bug_ratio <= 0.5:
        return 'A'
    elif bug_ratio <= 1.0:
        return 'A-'
    elif bug_ratio <= 1.5:
        return 'B+'
    elif bug_ratio <= 2.0:
        return 'B'
    elif bug_ratio <= 3.0:
        return 'B-'
    elif bug_ratio <= 4.0:
        return 'C'
    else:
        return 'D'


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Return aggregated dashboard statistics from the database."""
    user = _get_user_or_demo(request)

    if not user:
        return JsonResponse({
            'stats': {
                'total_reviews': 0,
                'critical_bugs': 0,
                'codebase_projects': 0,
                'quality_index': 'N/A',
            },
            'recent_reviews': [],
        })

    # All reviews for this user
    reviews = Review.objects.filter(user=user)
    total_reviews = reviews.count()

    # Count bugs from completed review results
    critical_count = 0
    major_count = 0
    completed_reviews = reviews.filter(status='complete')

    for review in completed_reviews:
        if review.result and isinstance(review.result, list):
            for issue in review.result:
                severity = issue.get('severity', '')
                if severity == 'critical':
                    critical_count += 1
                elif severity == 'major':
                    major_count += 1

    # Projects count
    project_count = Project.objects.filter(user=user).count()

    # Quality index
    quality_index = _calculate_quality_index(total_reviews, critical_count, major_count)

    # Recent reviews (last 5)
    recent = reviews.order_by('-created_at')[:5]
    now = timezone.now()
    recent_list = []

    for r in recent:
        # Count issues in this review
        issue_count = 0
        review_name = r.name or r.storage_path or f'Review #{r.id}'

        if r.result and isinstance(r.result, list):
            issue_count = len(r.result)

        # Human-readable time diff
        time_ago = timesince(r.created_at, now)
        # Simplify: take only the first segment
        time_ago = time_ago.split(',')[0].strip() + ' ago'

        recent_list.append({
            'id': str(r.id),
            'name': review_name,
            'date': time_ago,
            'language': (r.language or 'unknown').capitalize(),
            'issues': issue_count,
        })

    return JsonResponse({
        'stats': {
            'total_reviews': total_reviews,
            'critical_bugs': critical_count,
            'codebase_projects': project_count,
            'quality_index': quality_index,
        },
        'recent_reviews': recent_list,
    })
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

    # 3. Call Kimi and Stream back
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
        collected_chunks = []
        try:
            response = client.chat.completions.create(
                model=KIMI_MODEL,
                messages=[
                    {"role": "system", "content": REVIEW_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Language: {language}\nCode:\n{code}"}
                ],
                stream=True,
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    text = chunk.choices[0].delta.content or ""
                    if text:
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
