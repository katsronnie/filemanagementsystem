from django.test import TestCase
from django.urls import reverse, resolve
from django.contrib.auth import views as auth_views
from ..views import (
    LoginView, DashboardView, file_upload_view, file_browser_view,
    search_files, get_scanners, scan_document, finalize_scan,
    upload_file_api, get_file_structure, get_files_by_date,
    delete_file, get_user_profile, UserManagementView, CategoriesView
)

class URLTests(TestCase):
    def test_login_url_resolves(self):
        url = reverse('login')
        self.assertEqual(resolve(url).func.view_class, LoginView)

    def test_dashboard_url_resolves(self):
        url = reverse('dashboard')
        self.assertEqual(resolve(url).func.view_class, DashboardView)

    def test_user_dashboard_url_resolves(self):
        url = reverse('user_dashboard')
        self.assertTrue(callable(resolve(url).func))

    def test_file_upload_url_resolves(self):
        url = reverse('upload')
        self.assertTrue(callable(resolve(url).func))

    def test_file_browser_url_resolves(self):
        url = reverse('file_browser')
        self.assertTrue(callable(resolve(url).func))

    def test_search_files_url_resolves(self):
        url = reverse('search_files')
        self.assertTrue(callable(resolve(url).func))

    def test_get_scanners_url_resolves(self):
        url = reverse('get_scanners')
        self.assertTrue(callable(resolve(url).func))

    def test_scan_document_url_resolves(self):
        url = reverse('scan_document')
        self.assertTrue(callable(resolve(url).func))

    # Removed test_finalize_scan_url_resolves as the endpoint doesn't exist

    def test_upload_file_api_url_resolves(self):
        url = reverse('upload_file_api')
        self.assertTrue(callable(resolve(url).func))

    def test_get_file_structure_url_resolves(self):
        url = reverse('get_file_structure')
        self.assertTrue(callable(resolve(url).func))

    def test_get_files_by_date_url_resolves(self):
        url = reverse('get_files_by_date')
        self.assertTrue(callable(resolve(url).func))

    def test_delete_file_url_resolves(self):
        url = reverse('delete_file', args=[1])  # Test with a sample file ID
        self.assertTrue(callable(resolve(url).func))

    def test_get_user_profile_url_resolves(self):
        url = reverse('get_user_profile')
        self.assertTrue(callable(resolve(url).func))

    def test_user_management_url_resolves(self):
        url = reverse('usermanagement')
        self.assertEqual(resolve(url).func.view_class, UserManagementView)

    def test_categories_url_resolves(self):
        url = reverse('categories')
        self.assertEqual(resolve(url).func.view_class, CategoriesView)

    def test_logout_url_resolves(self):
        url = reverse('logout')
        self.assertEqual(resolve(url).func.view_class, auth_views.LogoutView)

    # Test URL patterns with parameters
    def test_user_browser_with_params_url_resolves(self):
        url = reverse('user_browser_day', kwargs={
            'year': 2025,
            'month': 8,
            'day': 21
        })
        self.assertTrue(callable(resolve(url).func))

    # Removed test_category_detail_url_resolves as the endpoint doesn't exist
