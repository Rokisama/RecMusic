# Generated by Django 5.1.7 on 2025-03-16 17:09

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_useractivity'),
    ]

    operations = [
        migrations.DeleteModel(
            name='UserActivity',
        ),
    ]
