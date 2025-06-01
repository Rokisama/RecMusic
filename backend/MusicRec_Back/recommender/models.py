from django.db import models
from django.contrib.auth import get_user_model
from songs.models import Song
from django.utils import timezone
User = get_user_model()

class UserActivity(models.Model):
    ACTIVITY_TYPES = [
        ("play", "Played song"),
        ("like", "Liked song"),
        ("unlike", "Unliked song"),
        ("skip", "Skipped song"),
        ("addPlaylist", "Added to playlist"),
        ("removePlaylist", "Removed from playlist"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    track_id = models.CharField(max_length=100, null=True, blank=True)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    trained_on = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} - {self.timestamp}"


