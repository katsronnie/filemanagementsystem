from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings

class Department(models.Model):
    DEPARTMENT_CHOICES = [
        ('NEONATAL', 'Neonatal Care'),
        ('PEDIATRIC', 'Pediatrics'),
        ('EMERGENCY', 'Emergency'),
        ('SURGERY', 'Surgery'),
        
        ('LAB', 'Laboratory'),
        ('RADIOLOGY', 'Radiology'),
        ('ADMINISTRATION', 'Administration'),
    ]
    
    code = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, unique=True)
    name = models.CharField(max_length=100)
    
    class Meta:
        ordering = ['name']
    
    def save(self, *args, **kwargs):
        # Automatically set the name based on the code if not provided
        if not self.name:
            self.name = dict(self.DEPARTMENT_CHOICES).get(self.code, self.code)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class User(AbstractUser):
    is_approved = models.BooleanField(default=False)
    department = models.ForeignKey(
        Department, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='users'
    )
    
    groups = models.ManyToManyField(
        Group,
        verbose_name=_('groups'),
        blank=True,
        help_text=_('The groups this user belongs to.'),
        related_name='custom_user_set',
        related_query_name='user',
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='custom_user_set',
        related_query_name='user',
    )
    
    def __str__(self):
        return self.username

class UserSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    login_time = models.DateTimeField(default=timezone.now)
    logout_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-login_time']
        
    def save(self, *args, **kwargs):
        # Ensure times are timezone-aware
        if self.login_time and timezone.is_naive(self.login_time):
            self.login_time = timezone.make_aware(self.login_time)
        if self.logout_time and timezone.is_naive(self.logout_time):
            self.logout_time = timezone.make_aware(self.logout_time)
            
        # Validate logout time is after login time
        if self.logout_time and self.login_time and self.logout_time < self.login_time:
            raise ValueError("Logout time cannot be before login time")
            
        super().save(*args, **kwargs)

    def __str__(self):
        login_time_str = timezone.localtime(self.login_time).strftime("%Y-%m-%d %H:%M:%S")
        if self.logout_time:
            logout_time_str = timezone.localtime(self.logout_time).strftime("%Y-%m-%d %H:%M:%S")
            return f"{self.user.username}: {login_time_str} to {logout_time_str}"
        return f"{self.user.username}: {login_time_str} (Active)"

class Category(models.Model):
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='categories')

    def __str__(self):
        return f"{self.name} ({self.department})"

class YearFolder(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='year_folders')
    year = models.PositiveIntegerField()

    class Meta:
        unique_together = ('category', 'year')
        ordering = ['-year']

    def __str__(self):
        return f"{self.year} - {self.category}"

class MonthFolder(models.Model):
    MONTH_CHOICES = [
        (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
        (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
        (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December'),
    ]
    year_folder = models.ForeignKey(YearFolder, on_delete=models.CASCADE, related_name='month_folders')
    month = models.PositiveSmallIntegerField(choices=MONTH_CHOICES)

    class Meta:
        unique_together = ('year_folder', 'month')
        ordering = ['-year_folder__year', '-month']

    def __str__(self):
        return f"{self.get_month_display()} {self.year_folder.year}"

class DateFolder(models.Model):
    month_folder = models.ForeignKey(MonthFolder, on_delete=models.CASCADE, related_name='date_folders')
    date = models.PositiveSmallIntegerField()  # Day of month (1-31)
    full_date = models.DateField(null=True, blank=True)  # Add this field to store the complete date
    
    class Meta:
        unique_together = ('month_folder', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.date:02d}-{self.month_folder.month:02d}-{self.month_folder.year_folder.year}"

class MedicalFile(models.Model):
    FILE_TYPES = [
        ('PDF', 'PDF Document'),
        ('DOC', 'Word Document'),
        ('XLS', 'Excel File'),
        ('IMG', 'Image'),
        ('VID', 'Video'),
        ('AUD', 'Audio'),
        ('OTH', 'Other'),
    ]
    
    date_folder = models.ForeignKey(DateFolder, on_delete=models.CASCADE, related_name='medical_files')
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='medical_files/%Y/%m/%d/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_type = models.CharField(max_length=3, choices=FILE_TYPES)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    size = models.PositiveIntegerField()  # in bytes

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.name} ({self.get_file_type_display()})"