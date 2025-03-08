from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# Create your models here.
class Song(models.Model):
    track_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    artist = models.CharField(max_length=255)
    spotify_preview_url = models.URLField(max_length=500)
    spotify_id = models.CharField(max_length=255)
    tags = models.CharField(max_length=500)
    year = models.IntegerField()
    duration_ms = models.IntegerField()
    danceability = models.FloatField()
    energy = models.FloatField()
    key = models.FloatField()
    loudness = models.FloatField()
    mode = models.IntegerField()
    speechiness = models.FloatField()
    acousticness = models.FloatField()
    instrumentalness = models.FloatField()
    liveness = models.FloatField()
    valence = models.FloatField()
    tempo = models.FloatField()
    time_signature = models.FloatField()

class LikedSong(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'song')

class Playlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    songs = models.ManyToManyField(Song, related_name='playlists')

    class Meta:
        unique_together = ('user', 'name')