from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    path = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.user.email})"

class CodeChunk(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='chunks')
    file_path = models.TextField()
    start_line = models.IntegerField()
    end_line = models.IntegerField()
    content = models.TextField()
    embedding = models.JSONField() # Store 1536-dimensional float vector

    def __str__(self):
        return f"{self.file_path} ({self.start_line}-{self.end_line})"

class ChatMessage(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=50) # user | assistant
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role}: {self.content[:30]}..."
