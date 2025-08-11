from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Department, 
    User, 
    UserSession, 
    Category, 
    YearFolder, 
    MonthFolder, 
    DateFolder, 
    MedicalFile
)

# Custom User Admin
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'department', 'is_approved', 'is_staff')
    list_filter = ('department', 'is_approved', 'is_staff', 'is_superuser')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {
            'fields': ('is_active', 'is_approved', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Department', {'fields': ('department',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'department', 'is_approved', 'is_staff'),
        }),
    )

# Department Admin
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')
    search_fields = ('name', 'code')
    list_display_links = ('name',)

# User Session Admin
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'login_time', 'logout_time', 'session_duration')
    list_filter = ('user',)
    search_fields = ('user__username',)
    readonly_fields = ('login_time',)
    
    def session_duration(self, obj):
        if obj.logout_time:
            duration = obj.logout_time - obj.login_time
            return str(duration).split('.')[0]  # Remove microseconds
        return "Active"
    session_duration.short_description = 'Duration'

# Category Admin
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'department')
    list_filter = ('department',)
    search_fields = ('name', 'department__name')

# Year Folder Admin
class YearFolderAdmin(admin.ModelAdmin):
    list_display = ('year', 'category')
    list_filter = ('category', 'year')
    search_fields = ('category__name', 'year')

# Month Folder Admin
class MonthFolderAdmin(admin.ModelAdmin):
    list_display = ('get_month_display', 'year_folder')
    list_filter = ('year_folder__category', 'year_folder__year', 'month')
    search_fields = ('year_folder__category__name',)
    
    def get_month_display(self, obj):
        return obj.get_month_display()
    get_month_display.short_description = 'Month'

# Date Folder Admin
class DateFolderAdmin(admin.ModelAdmin):
    list_display = ('date', 'month_folder')
    list_filter = ('month_folder__year_folder__year', 'month_folder__month')
    search_fields = ('month_folder__year_folder__category__name',)

# Medical File Admin
class MedicalFileAdmin(admin.ModelAdmin):
    list_display = ('name', 'file_type', 'uploaded_by', 'uploaded_at', 'date_folder')
    list_filter = ('file_type', 'uploaded_by', 'uploaded_at')
    search_fields = ('name', 'description')
    readonly_fields = ('uploaded_at', 'size')
    date_hierarchy = 'uploaded_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'uploaded_by', 
            'date_folder__month_folder__year_folder__category'
        )

# Register your models here
admin.site.register(Department, DepartmentAdmin)
admin.site.register(User, CustomUserAdmin)
admin.site.register(UserSession, UserSessionAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(YearFolder, YearFolderAdmin)
admin.site.register(MonthFolder, MonthFolderAdmin)
admin.site.register(DateFolder, DateFolderAdmin)
admin.site.register(MedicalFile, MedicalFileAdmin)