from django.shortcuts import render
from django.http import HttpResponse, JsonResponse

from Music.models import Song


# Create your views here.
def getSongs(request):
    songs = Song.objects.all().values()
    return JsonResponse(list(songs), safe=False)