import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    """Un-authenticated DRF client"""
    return APIClient()

@pytest.fixture
def auth_client(api_client, db):

    user = User.objects.create_user(username="testuser", password="pass")
    api_client.force_authenticate(user)
    return api_client
