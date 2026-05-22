from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.db import IntegrityError
# pyrefly: ignore [missing-import]
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'error': 'Email and password are required.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    clean_email = email.strip().lower()

    # Check if email is already taken
    if User.objects.filter(username=clean_email).exists() or User.objects.filter(email=clean_email).exists():
        return Response(
            {'error': 'This email is already registered. Please Sign In instead.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create user
        user = User.objects.create_user(
            username=clean_email,
            email=clean_email,
            password=password
        )
        return Response({
            'success': True,
            'message': 'Account created successfully!',
            'user': {
                'id': user.id,
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'error': 'Email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    clean_email = email.strip().lower()
    
    # Django authenticates by username (which is email here)
    user = authenticate(request, username=clean_email, password=password)

    if user is not None:
        django_login(request, user)
        return Response({
            'success': True,
            'message': 'Successfully logged in!',
            'user': {
                'id': user.id,
                'email': user.email
            }
        })
    else:
        return Response(
            {'error': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    django_logout(request)
    return Response({
        'success': True,
        'message': 'Successfully logged out!'
    })

@api_view(['GET'])
def get_current_user(request):
    if request.user.is_authenticated:
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'email': request.user.email
            }
        })
    return Response({
        'authenticated': False
    })
