from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'user', 'language', 'status', 'created_at')
    list_filter = ('language', 'status')
    search_fields = ('name', 'user__username', 'user__email')
