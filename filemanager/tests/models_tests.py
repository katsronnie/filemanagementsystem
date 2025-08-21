from django.test import TestCase
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from ..models import Department, Category, YearFolder, MonthFolder, DateFolder, MedicalFile, User, UserSession

class DepartmentModelTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
        )

    def test_department_creation(self):
        """Test department creation with valid data"""
        self.assertEqual(self.department.name, 'Neonatal Care')
        self.assertEqual(self.department.code, 'NEONATAL')

    def test_department_str_representation(self):
        """Test string representation of department"""
        self.assertEqual(str(self.department), 'Neonatal Care')

    def test_department_unique_code(self):
        """Test that department code must be unique"""
        with self.assertRaises(Exception):
            Department.objects.create(
                code='NEONATAL',
                name='Another Neonatal'
            )

    def test_department_choices_validation(self):
        """Test that department code must be from choices"""
        with self.assertRaises(ValidationError):
            dept = Department(code='INVALID', name='Invalid Department')
            dept.full_clean()

class UserModelTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code='ADMINISTRATION',
            name='Administration'
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department
        )

    def test_user_creation(self):
        """Test user creation with valid data"""
        self.assertEqual(self.user.username, 'testuser')
        self.assertTrue(self.user.check_password('testpass123'))
        self.assertEqual(self.user.department, self.department)
        self.assertFalse(self.user.is_approved)

    def test_user_str_representation(self):
        """Test string representation of user"""
        self.assertEqual(str(self.user), 'testuser')

    def test_user_session_creation(self):
        """Test user session creation and tracking"""
        session = UserSession.objects.create(user=self.user)
        self.assertIsNotNone(session.login_time)
        self.assertIsNone(session.logout_time)

class CategoryModelTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
        )
        self.category = Category.objects.create(
            name='Test Category',
            department=self.department
        )

    def test_category_creation(self):
        """Test category creation with valid data"""
        self.assertEqual(self.category.name, 'Test Category')
        self.assertEqual(self.category.department, self.department)

    def test_category_str_representation(self):
        """Test string representation of category"""
        self.assertEqual(str(self.category), f'Test Category (Neonatal Care)')

class FolderStructureTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
        )
        self.category = Category.objects.create(
            name='Test Category',
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

    def test_year_folder_creation(self):
        """Test year folder creation and validation"""
        self.assertEqual(self.year_folder.year, 2025)
        self.assertEqual(self.year_folder.category, self.category)
        with self.assertRaises(Exception):
            # Test unique together constraint
            YearFolder.objects.create(
                category=self.category,
                year=2025
            )

    def test_month_folder_creation(self):
        """Test month folder creation and validation"""
        self.assertEqual(self.month_folder.month, 8)
        self.assertEqual(self.month_folder.year_folder, self.year_folder)
        with self.assertRaises(Exception):
            # Test unique together constraint
            MonthFolder.objects.create(
                year_folder=self.year_folder,
                month=8
            )

    def test_date_folder_creation(self):
        """Test date folder creation and validation"""
        self.assertEqual(self.date_folder.date, 21)
        self.assertEqual(self.date_folder.month_folder, self.month_folder)
        with self.assertRaises(Exception):
            # Test unique together constraint
            DateFolder.objects.create(
                month_folder=self.month_folder,
                date=21
            )

    def test_folder_str_representations(self):
        """Test string representations of folder structure"""
        self.assertEqual(str(self.year_folder), '2025 - Test Category (Neonatal Care)')
        self.assertEqual(str(self.month_folder), 'August 2025')
        self.assertEqual(str(self.date_folder), '21-08-2025')

class MedicalFileTests(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code='NEONATAL',
            name='Neonatal Care'
        )
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            department=self.department
        )
        self.category = Category.objects.create(
            name='Test Category',
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
        self.test_file = SimpleUploadedFile(
            "test.pdf",
            b"file_content",
            content_type="application/pdf"
        )

    def test_medical_file_creation(self):
        """Test medical file creation with valid data"""
        medical_file = MedicalFile.objects.create(
            name='test.pdf',
            file=self.test_file,
            uploaded_by=self.user,
            file_type='PDF',
            description='Test file description',
            size=len(b"file_content"),
            date_folder=self.date_folder,
            category=self.category
        )
        self.assertEqual(medical_file.name, 'test.pdf')
        self.assertEqual(medical_file.file_type, 'PDF')
        self.assertEqual(medical_file.uploaded_by, self.user)
        self.assertEqual(medical_file.category, self.category)
        self.assertIsNotNone(medical_file.uploaded_at)

    def test_medical_file_str_representation(self):
        """Test string representation of medical file"""
        medical_file = MedicalFile.objects.create(
            name='test.pdf',
            file=self.test_file,
            uploaded_by=self.user,
            file_type='PDF',
            size=len(b"file_content"),
            date_folder=self.date_folder,
            category=self.category
        )
        self.assertEqual(str(medical_file), 'test.pdf (PDF Document)')

    def test_medical_file_type_choices(self):
        """Test file type must be from choices"""
        with self.assertRaises(ValidationError):
            medical_file = MedicalFile(
                name='test.pdf',
                file=self.test_file,
                uploaded_by=self.user,
                file_type='INVALID',
                size=len(b"file_content"),
                date_folder=self.date_folder,
                category=self.category
            )
            medical_file.full_clean()

    def test_medical_file_size_validation(self):
        """Test file size must be positive"""
        with self.assertRaises(ValidationError):
            medical_file = MedicalFile(
                name='test.pdf',
                file=self.test_file,
                uploaded_by=self.user,
                file_type='PDF',
                size=-1,
                date_folder=self.date_folder,
                category=self.category
            )
            medical_file.full_clean()

    def test_medical_file_auto_date(self):
        """Test uploaded_at is automatically set"""
        medical_file = MedicalFile.objects.create(
            name='test.pdf',
            file=self.test_file,
            uploaded_by=self.user,
            file_type='PDF',
            size=len(b"file_content"),
            date_folder=self.date_folder,
            category=self.category
        )
        self.assertIsNotNone(medical_file.uploaded_at)
        self.assertLess(
            (timezone.now() - medical_file.uploaded_at).total_seconds(),
            5  # Should have been created less than 5 seconds ago
        )
