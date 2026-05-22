from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'language', 'status', 'created_at')
    list_filter = ('language', 'status')
    search_fields = ('user__username', 'user__email')
