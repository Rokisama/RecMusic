from django.contrib.auth.models import AbstractUser
from django.db import models
from songs.models import Song

class CustomUser(AbstractUser):
    email = None
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

