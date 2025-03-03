from django.db import models

# Create your models here.
class Song(models.Model):
    track_id = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    artist = models.CharField(max_length=50)
    spotify_preview_url = models.URLField()
    spotify_id = models.CharField(max_length=50)
    tags = models.CharField(max_length=100)
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