from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import UserRegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
from django.http import JsonResponse

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [AllowAny]

    @csrf_exempt
    def post(self, request):
        try:
            data = json.loads(request.body)
            serializer = UserRegisterSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return JsonResponse({"message": "User registered successfully"}, status=201)
            return JsonResponse(serializer.errors, status=400)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]

    @csrf_exempt
    def post(self, request):
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")
            user = authenticate(request, username=username, password=password)

            if user is not None:
                refresh = RefreshToken.for_user(user)
                update_last_login(None, user)
                return JsonResponse(
                    {"refresh": str(refresh), "access": str(refresh.access_token)},
                    status=200
                )
            return JsonResponse({"error": "Invalid credentials"}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    @csrf_exempt
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)