from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from ..models import Department, Category, YearFolder, MonthFolder, DateFolder, MedicalFile, User
from ..views import LoginView 
from ..models import Department, Category, YearFolder, MonthFolder, DateFolder, MedicalFile, User

class LoginViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.login_url = reverse('login')
        self.department = Department.objects.create(
            code='ADMINISTRATION',
            name='Administration'
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department,
            is_approved=True  # Make sure user is approved
        )
        self.admin_user = User.objects.create_user(
            username='adminuser',
            password='testpass123',
            department=self.department,
            is_staff=True,
            is_approved=True  # Make sure admin is approved
        )

    def test_login_page_loads(self):
        response = self.client.get(self.login_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'registration/login.html')

    def test_login_with_valid_credentials(self):
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 302)  # Should redirect after login
        self.assertTrue('_auth_user_id' in self.client.session)

    def test_login_with_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'wrongpass'
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Please enter a correct username and password')

    def test_admin_login_redirects_to_dashboard(self):
        response = self.client.post(self.login_url, {
            'username': 'adminuser',
            'password': 'testpass123'
        }, follow=True)
        self.assertRedirects(response, reverse('dashboard'))

class DashboardViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.dashboard_url = reverse('dashboard')
        self.department = Department.objects.create(
            code='ADMINISTRATION',
            name='Administration'
        )
        self.category = Category.objects.create(
            name='Test Category',
            department=self.department
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department
        )

    def test_dashboard_requires_login(self):
        response = self.client.get(self.dashboard_url)
        expected_url = f"{reverse('login')}?next={self.dashboard_url}"
        self.assertEqual(response.status_code, 302)  # Check for redirect
        self.assertTrue(response.url.startswith(reverse('login')))  # Check it redirects to login
        self.assertTrue('next=' in response.url)  # Check next parameter exists

    def test_dashboard_loads_for_authenticated_user(self):
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(self.dashboard_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'dashboard.html')

    def test_dashboard_shows_user_department_files(self):
        self.client.login(username='testuser', password='testpass123')
        # Create a test file
        year_folder = YearFolder.objects.create(category=self.category, year=2025)
        month_folder = MonthFolder.objects.create(year_folder=year_folder, month=8)
        date_folder = DateFolder.objects.create(month_folder=month_folder, date=21)
        test_file = MedicalFile.objects.create(
            name='test.pdf',
            file=SimpleUploadedFile("test.pdf", b"file_content"),
            uploaded_by=self.user,
            file_type='PDF',
            size=1000,
            date_folder=date_folder,
            category=self.category
        )
        
        response = self.client.get(self.dashboard_url)
        self.assertContains(response, 'test.pdf')

class FileUploadViewTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.upload_url = reverse('upload')  # Use the direct URL name
        self.department = Department.objects.create(
            code='ADMINISTRATION',
            name='Administration'
        )
        self.category = Category.objects.create(
            name='Test Category',
            department=self.department
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department,
            is_approved=True
        )
        self.client.login(username='testuser', password='testpass123')

    def test_file_upload_requires_login(self):
        self.client.logout()
        response = self.client.get(self.upload_url)
        self.assertRedirects(response, f'{reverse("login")}?next={self.upload_url}')

    def test_file_upload_get_page(self):
        response = self.client.get(self.upload_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'file_upload.html')

    def test_file_upload_post_success(self):
        self.client.login(username='testuser', password='testpass123')
        test_file = SimpleUploadedFile(
            "test.pdf",
            b"file_content",
            content_type="application/pdf"
        )
        response = self.client.post(self.upload_url, {
            'file': test_file,  # Using 'file' to match the view's form field name
            'category': self.category.name,
            'year': '2025',
            'month': '8',
            'date': '21',
            'description': 'Test file description'
        }, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Successfully uploaded the file')
        self.assertTrue(MedicalFile.objects.filter(name='test.pdf').exists())

class UserProfileTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.profile_url = reverse('get_user_profile')  # Changed from 'user_profile' to 'get_user_profile'
        self.department = Department.objects.create(
            code='ADMINISTRATION',
            name='Administration'
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department
        )
        self.client.login(username='testuser', password='testpass123')

    def test_profile_requires_login(self):
        self.client.logout()
        response = self.client.get(self.profile_url)
        self.assertRedirects(response, f'{reverse("login")}?next={self.profile_url}')

    def test_profile_returns_correct_data(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['userProfile']['department'], 'Administration')
        self.assertEqual(data['userProfile']['role'], 'user')

class FileSearchTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.search_url = reverse('search_files')
        self.department = Department.objects.create(
            code='ADMINISTRATION',
            name='Administration'
        )
        self.category = Category.objects.create(
            name='Test Category',
            department=self.department
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department
        )
        self.client.login(username='testuser', password='testpass123')

        # Create test file
        year_folder = YearFolder.objects.create(category=self.category, year=2025)
        month_folder = MonthFolder.objects.create(year_folder=year_folder, month=8)
        date_folder = DateFolder.objects.create(month_folder=month_folder, date=21)
        self.test_file = MedicalFile.objects.create(
            name='searchable.pdf',
            file=SimpleUploadedFile("searchable.pdf", b"file_content"),
            uploaded_by=self.user,
            file_type='PDF',
            size=1000,
            date_folder=date_folder,
            category=self.category
        )

    def test_search_requires_login(self):
        self.client.logout()
        response = self.client.get(self.search_url)
        self.assertEqual(response.status_code, 302)  # Check for redirect
        self.assertTrue(response.url.startswith(reverse('login')))  # Check it redirects to login
        self.assertTrue('next=' in response.url)  # Check next parameter exists

    def test_search_by_filename(self):
        response = self.client.get(f'{self.search_url}?query=searchable')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['files']), 1)
        self.assertEqual(data['files'][0]['name'], 'searchable.pdf')

    def test_search_by_date_range(self):
        response = self.client.get(f'{self.search_url}?dateRange=today')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['files']), 1)

    def test_search_by_file_type(self):
        response = self.client.get(f'{self.search_url}?fileType=PDF')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['files']), 1)
        self.assertEqual(data['files'][0]['file_type'], 'PDF')
