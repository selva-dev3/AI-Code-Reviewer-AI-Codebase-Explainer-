from django.contrib import admin
from .models import Project, CodeChunk, ChatMessage

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'user', 'created_at')
    search_fields = ('name', 'user__username', 'user__email')

@admin.register(CodeChunk)
class CodeChunkAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'file_path', 'start_line', 'end_line')
    search_fields = ('file_path', 'project__name')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'role', 'content_snippet', 'created_at')
    list_filter = ('role',)
    
    def content_snippet(self, obj):
        return obj.content[:40]
    content_snippet.short_description = 'Content'
