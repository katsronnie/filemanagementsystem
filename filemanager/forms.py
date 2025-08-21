# forms.py
from django import forms
from django.core.exceptions import ValidationError
from .models import MedicalFile, Category, DateFolder

class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True

class MultipleFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleFileInput())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_file_clean = super().clean
        if isinstance(data, (list, tuple)):
            result = [single_file_clean(d, initial) for d in data]
        else:
            result = single_file_clean(data, initial)
        return result

class FileUploadForm(forms.Form):
    ALLOWED_CONTENT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'audio/mpeg',
        'application/zip'
    ]

    files = MultipleFileField(
        required=True,
        widget=MultipleFileInput(attrs={
            'class': 'form-control',
            'accept': '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip'
        }),
        help_text="Select one or more files to upload"
    )
    
    name = forms.CharField(
        max_length=255,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Optional: Custom name (for single file)'
        })
    )
    
    description = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'rows': 3,
            'placeholder': 'File description (optional)'
        })
    )
    
    date_folder = forms.ModelChoiceField(
        queryset=DateFolder.objects.none(),
        required=False,
        empty_label="Select date folder",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        required=False,
        empty_label="No category",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    tags = forms.CharField(
        max_length=500,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Comma-separated tags (e.g., work, important, draft)'
        }),
        help_text="Separate tags with commas"
    )
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            # Filter date folders by user's department through category
            if user.department:
                self.fields['date_folder'].queryset = DateFolder.objects.filter(
                    month_folder__year_folder__category__department=user.department
                )
    
    def clean_files(self):
        files = self.cleaned_data.get('files')
        if not files:
            raise ValidationError("You must select at least one file to upload.")
            
        if isinstance(files, list):
            for file in files:
                if file.content_type not in self.ALLOWED_CONTENT_TYPES:
                    raise ValidationError(f"File type {file.content_type} is not allowed.")
        else:
            if files.content_type not in self.ALLOWED_CONTENT_TYPES:
                raise ValidationError(f"File type {files.content_type} is not allowed.")
                
        return files
        
    def clean_tags(self):
        tags = self.cleaned_data.get('tags', '')
        if tags:
            # Clean and validate tags
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            if len(tag_list) > 10:
                raise ValidationError("Maximum 10 tags allowed")
            return ', '.join(tag_list)
        return tags

class FolderForm(forms.ModelForm):
    class Meta:
        model = DateFolder
        fields = ['date', 'month_folder']
        widgets = {
            'date': forms.NumberInput(attrs={
                'class': 'form-control',
                'placeholder': 'Day of month (1-31)',
                'min': 1,
                'max': 31
            }),
            'month_folder': forms.Select(attrs={
                'class': 'form-control'
            })
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            self.fields['month_folder'].empty_label = "Select month folder"
    
    def clean_date(self):
        date = self.cleaned_data['date']
        month_folder = self.cleaned_data.get('month_folder')
        
        if date < 1 or date > 31:
            raise ValidationError("Date must be between 1 and 31")
            
        # Check for duplicate date in the same month folder
        if month_folder:
            existing = DateFolder.objects.filter(
                date=date,
                month_folder=month_folder
            )
            
            if self.instance.pk:
                existing = existing.exclude(pk=self.instance.pk)
            
            if existing.exists():
                raise ValidationError("A folder for this date already exists in the selected month")
        
        return date

class FileEditForm(forms.ModelForm):
    class Meta:
        model = MedicalFile
        fields = ['name', 'description', 'date_folder', 'category', 'file_type']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3
            }),
            'folder': forms.Select(attrs={
                'class': 'form-control'
            }),
            'category': forms.Select(attrs={
                'class': 'form-control'
            }),
            'tags': forms.TextInput(attrs={
                'class': 'form-control'
            })
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            self.fields['date_folder'].queryset = DateFolder.objects.all()
            self.fields['date_folder'].empty_label = "Select date folder"

class FileSearchForm(forms.Form):
    query = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Search files...'
        })
    )
    
    category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        required=False,
        empty_label="All categories",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    date_folder = forms.ModelChoiceField(
        queryset=DateFolder.objects.all(),
        required=False,
        empty_label="All folders",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    file_type = forms.ChoiceField(
        choices=[
            ('', 'All types'),
            ('image/', 'Images'),
            ('application/pdf', 'PDF'),
            ('text/', 'Text files'),
            ('video/', 'Videos'),
            ('audio/', 'Audio'),
            ('application/', 'Documents')
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            # Filter date folders by user's department
            if user.department:
                self.fields['date_folder'].queryset = DateFolder.objects.filter(
                    month_folder__year_folder__category__department=user.department
                )