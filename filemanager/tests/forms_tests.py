from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from ..models import Department, Category, User, YearFolder, MonthFolder, DateFolder
from ..forms import FileUploadForm, FileSearchForm, FileEditForm
from django.utils import timezone

class FileUploadFormTests(TestCase):
    def setUp(self):
        # Create department and category
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
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
        
        # Create folder structure
        self.year_folder = YearFolder.objects.create(
            category=self.category,
            year=2025
        )
        self.month_folder = MonthFolder.objects.create(
            year_folder=self.year_folder,
            month=8
        )
        self.date_folder = DateFolder.objects.create(
            month_folder=self.month_folder,
            date=21
        )

    def test_file_upload_form_valid_data(self):
        test_file = SimpleUploadedFile(
            "test.pdf",
            b"file_content",
            content_type="application/pdf"
        )
        form_data = {
            'name': 'Test File',
            'description': 'Test Description',
            'date_folder': self.date_folder.id,
            'category': self.category.id
        }
        form_files = {
            'files': [test_file]
        }
        form = FileUploadForm(data=form_data, files=form_files, user=self.user)
        self.assertTrue(form.is_valid())

    def test_file_upload_form_no_file(self):
        form_data = {
            'name': 'Test File',
            'description': 'Test Description',
            'date_folder': self.date_folder.id,
            'category': self.category.id
        }
        form = FileUploadForm(data=form_data, user=self.user)
        self.assertFalse(form.is_valid())
        self.assertIn('files', form.errors)

    def test_file_upload_form_invalid_file_type(self):
        test_file = SimpleUploadedFile(
            "test.exe",
            b"file_content",
            content_type="application/x-msdownload"
        )
        form_data = {
            'name': 'Test File',
            'description': 'Test Description',
            'date_folder': self.date_folder.id,
            'category': self.category.id
        }
        form_files = {
            'files': [test_file]
        }
        form = FileUploadForm(data=form_data, files=form_files, user=self.user)
        self.assertFalse(form.is_valid())

class FileSearchFormTests(TestCase):
    def setUp(self):
        # Create department and category
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
        )
        self.category = Category.objects.create(
            name='Test Category',
            department=self.department
        )
        
        # Create folder structure
        self.year_folder = YearFolder.objects.create(
            category=self.category,
            year=2025
        )
        self.month_folder = MonthFolder.objects.create(
            year_folder=self.year_folder,
            month=8
        )
        self.date_folder = DateFolder.objects.create(
            month_folder=self.month_folder,
            date=21
        )

    def test_search_form_empty_data(self):
        form = FileSearchForm(data={})
        self.assertTrue(form.is_valid())  # Search form should be valid even with no data

    def test_search_form_with_query(self):
        form_data = {
            'query': 'test search',
            'category': self.category.id,
            'file_type': 'application/pdf',
            'date_folder': self.date_folder.id if hasattr(self, 'date_folder') else None
        }
        form = FileSearchForm(data=form_data)
        self.assertTrue(form.is_valid())

    def test_search_form_invalid_dates(self):
        # Since we removed date range fields from search form, test for invalid folder instead
        form_data = {
            'date_folder': 999  # Non-existent folder ID
        }
        form = FileSearchForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('date_folder', form.errors)

class FileEditFormTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
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
        self.year_folder = YearFolder.objects.create(
            category=self.category,
            year=2025
        )
        self.month_folder = MonthFolder.objects.create(
            year_folder=self.year_folder,
            month=8
        )
        self.date_folder = DateFolder.objects.create(
            month_folder=self.month_folder,
            date=21
        )

    def test_file_edit_form_valid_data(self):
        form_data = {
            'name': 'Updated File Name',
            'description': 'Updated description',
            'file_type': 'PDF',
            'category': self.category.id,
            'date_folder': self.date_folder.id
        }
        form = FileEditForm(data=form_data, user=self.user)
        self.assertTrue(form.is_valid())

    def test_file_edit_form_missing_name(self):
        form_data = {
            'description': 'Updated description',
            'file_type': 'PDF',
            'category': self.category.id,
            'date_folder': self.date_folder.id
        }
        form = FileEditForm(data=form_data, user=self.user)
        self.assertFalse(form.is_valid())
        self.assertIn('name', form.errors)

    def test_file_edit_form_invalid_file_type(self):
        form_data = {
            'name': 'Updated File Name',
            'description': 'Updated description',
            'file_type': 'INVALID',
            'category': self.category.id
        }
        form = FileEditForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('file_type', form.errors)
