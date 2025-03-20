from rest_framework import serializers
from django.conf import settings
from .models import UserActivity
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()

class UserActivitySerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(write_only=True)
    track_id = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = UserActivity
        fields = ['user_id', 'track_id', 'activity_type', 'timestamp']

    def create(self, validated_data):
        user_id = validated_data.pop('user_id')
        track_id = validated_data.pop('track_id', None)

        user = User.objects.get(id=user_id)

        if track_id:
            if validated_data['activity_type'] == "unlike":
                UserActivity.objects.filter(user=user, track_id=track_id, activity_type="like").delete()
                return UserActivity(user=user, track_id=track_id, activity_type="unlike")

            if validated_data['activity_type'] == "removePlaylist":
                UserActivity.objects.filter(user=user, track_id=track_id, activity_type="addPlaylist").delete()
                return UserActivity(user=user, track_id=track_id, activity_type="removePlaylist")  

        return UserActivity.objects.create(user=user, track_id=track_id, **validated_data)
