# forms.py
from django import forms
from django.core.exceptions import ValidationError
from .models import FileDocument, FileFolder, FileCategory

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
    files = MultipleFileField(
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
    
    folder = forms.ModelChoiceField(
        queryset=FileFolder.objects.none(),
        required=False,
        empty_label="Root folder",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    category = forms.ModelChoiceField(
        queryset=FileCategory.objects.all(),
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
            self.fields['folder'].queryset = FileFolder.objects.filter(owner=user)
    
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
        model = FileFolder
        fields = ['name', 'parent']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Folder name'
            }),
            'parent': forms.Select(attrs={
                'class': 'form-control'
            })
        }
    
    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            self.fields['parent'].queryset = FileFolder.objects.filter(owner=user)
            self.fields['parent'].empty_label = "Root folder"
    
    def clean_name(self):
        name = self.cleaned_data['name']
        parent = self.cleaned_data.get('parent')
        
        # Check for duplicate folder names in the same parent
        existing = FileFolder.objects.filter(
            name=name,
            parent=parent,
            owner=self.instance.owner if self.instance.pk else None
        )
        
        if self.instance.pk:
            existing = existing.exclude(pk=self.instance.pk)
        
        if existing.exists():
            raise ValidationError("A folder with this name already exists in the selected location")
        
        return name

class FileEditForm(forms.ModelForm):
    class Meta:
        model = FileDocument
        fields = ['name', 'description', 'folder', 'category', 'tags']
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
            self.fields['folder'].queryset = FileFolder.objects.filter(owner=user)
            self.fields['folder'].empty_label = "Root folder"

class FileSearchForm(forms.Form):
    query = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Search files...'
        })
    )
    
    category = forms.ModelChoiceField(
        queryset=FileCategory.objects.all(),
        required=False,
        empty_label="All categories",
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    folder = forms.ModelChoiceField(
        queryset=FileFolder.objects.none(),
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
            self.fields['folder'].queryset = FileFolder.objects.filter(owner=user)