# Generated by Django 5.1.7 on 2025-03-08 13:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('songs', '0002_playlist'),
    ]

    operations = [
        migrations.AlterField(
            model_name='song',
            name='tags',
            field=models.CharField(max_length=255),
        ),
    ]
