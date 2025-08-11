from django.urls import path
from .views import (
    LoginView, 
    DashboardView, 
    file_upload_view, 
    upload_file_api,
    file_browser_view,
    get_file_structure,
    get_files_by_date,
    delete_file,
    get_user_profile,
    UserManagementView,
    CategoriesView,
    AddUserView,
    dashboard_stats,
    add_user_api
    
)
from . import views

urlpatterns = [
    # Authentication
    path('login/', LoginView.as_view(), name='login'),
    
    # Main Views
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('upload/', file_upload_view, name='upload'),
    path('browser/', file_browser_view, name='file_browser'),
    path('categories/', CategoriesView.as_view(), name='categories'),
    path('usermanagement/', UserManagementView.as_view(), name='usermanagement'),
    path('get_scanners/', views.get_scanners, name='get_scanners'),
    path('scan_document/', views.scan_document, name='scan_document'),
    path('user_dashboard/', views.user_dashboard, name='user_dashboard'),
    path('user_browser/', views.user_browser, name='user_browser'),
    path('user_browser/<int:year>/', views.user_browser, name='user_browser_year'),
    path('user_browser/<int:year>/<int:month>/', views.user_browser, name='user_browser_month'),
    path('user_browser/<int:year>/<int:month>/<int:day>/', views.user_browser, name='user_browser_day'),
    
    
    # API Endpoints
    path('api/upload/', upload_file_api, name='upload_file_api'),
    path('api/browse/structure/', get_file_structure, name='get_file_structure'),
    path('api/browse/files/', get_files_by_date, name='get_files_by_date'),
    path('api/browse/files/<int:file_id>/', delete_file, name='delete_file'),
    path('api/user/profile/', get_user_profile, name='get_user_profile'),
    path('api/users/add/', add_user_api, name='add_user_api'),
    path('api/dashboard-stats/', dashboard_stats, name='dashboard_stats'),
]