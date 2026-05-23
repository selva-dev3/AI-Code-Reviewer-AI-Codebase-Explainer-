import json
from django.test import RequestFactory
from django.contrib.auth.models import User
from explainer.views import execute_explain

# Create mock request
factory = RequestFactory()
request = factory.post('/api/explain', data=json.dumps({
    'question': 'hello',
    'projectId': 'demo-proj-1'
}), content_type='application/json')

# Mock anonymous user
class MockUser:
    is_authenticated = True
    is_active = True
request.user = MockUser()

print("Calling execute_explain...")
try:
    response = execute_explain(request)
    print("Status code:", response.status_code)
    print("Content type:", response.get('Content-Type'))
    
    # Try reading the stream content
    if hasattr(response, 'streaming_content'):
        print("Reading stream:")
        for chunk in response.streaming_content:
            print("Chunk:", chunk.decode('utf-8'))
    else:
        print("Content:", response.content)
except Exception as e:
    import traceback
    print("Error occurred:")
    traceback.print_exc()
