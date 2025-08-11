# services/file_service.py
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from .storage_service import StorageFactory
from ..models import FileDocument, FileActivity, FileFolder
import mimetypes
import os

class FileService:
    """Service class for handling file operations"""
    
    def __init__(self, storage_backend=None):
        self.storage_backend = storage_backend or getattr(settings, 'DEFAULT_FILE_STORAGE_BACKEND', 'local')
        self.storage_service = StorageFactory.get_storage_service(self.storage_backend)
        self.max_file_size = getattr(settings, 'MAX_FILE_SIZE', 100 * 1024 * 1024)  # 100MB default
        self.allowed_extensions = getattr(settings, 'ALLOWED_FILE_EXTENSIONS', [
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
            'jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp',
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
            'mp3', 'wav', 'flac', 'aac', 'ogg',
            'zip', 'rar', '7z', 'tar', 'gz'
        ])
    
    def validate_file(self, file):
        """Validate uploaded file"""
        errors = []
        
        # Check file size
        if file.size > self.max_file_size:
            errors.append(f"File size exceeds maximum allowed size of {self.max_file_size / (1024*1024):.1f}MB")
        
        # Check file extension
        ext = os.path.splitext(file.name)[1].lower().lstrip('.')
        if ext not in self.allowed_extensions:
            errors.append(f"File extension '{ext}' is not allowed")
        
        # Check file content type
        content_type = file.content_type
        if not content_type:
            content_type, _ = mimetypes.guess_type(file.name)
        
        if not content_type:
            errors.append("Could not determine file type")
        
        if errors:
            raise ValidationError(errors)
        
        return True
    
    @transaction.atomic
    def upload_file(self, file, user, folder=None, category=None, name=None, description="", tags=""):
        """Upload a file and create database record"""
        
        # Validate file
        self.validate_file(file)
        
        # Check for duplicate files (by checksum)
        checksum = self.storage_service.calculate_checksum(file)
        existing_file = FileDocument.objects.filter(
            checksum=checksum, 
            owner=user, 
            is_active=True
        ).first()
        
        if existing_file:
            raise ValidationError("This file already exists in your library")
        
        # Upload to storage
        file.seek(0)  # Reset file pointer after checksum calculation
        upload_result = self.storage_service.upload_file(file)
        
        # Create database record
        file_doc = FileDocument.objects.create(
            name=name or file.name,
            original_name=file.name,
            description=description,
            file=upload_result['path'] if self.storage_backend == 'local' else '',
            file_size=file.size,
            file_type=file.content_type or mimetypes.guess_type(file.name)[0],
            file_extension=os.path.splitext(file.name)[1].lower(),
            folder=folder,
            category=category,
            tags=tags,
            owner=user,
            storage_backend=self.storage_backend,
            cloud_url=upload_result.get('url'),
            checksum=upload_result['checksum']
        )
        
        # Log activity
        FileActivity.objects.create(
            file=file_doc,
            user=user,
            action='upload',
            details={'file_size': file.size, 'storage_backend': self.storage_backend}
        )
        
        return file_doc
    
    def download_file(self, file_doc, user, request=None):
        """Generate download URL or stream file"""
        
        # Check permissions
        if not self.can_access_file(file_doc, user):
            raise ValidationError("You don't have permission to access this file")
        
        # Update last accessed
        file_doc.last_accessed = timezone.now()
        file_doc.save(update_fields=['last_accessed'])
        
        # Log activity
        ip_address = None
        if request:
            ip_address = self.get_client_ip(request)
        
        FileActivity.objects.create(
            file=file_doc,
            user=user,
            action='download',
            ip_address=ip_address
        )
        
        # Return appropriate URL or file stream
        if file_doc.storage_backend == 'local':
            return file_doc.file.url
        else:
            return self.storage_service.get_file_url(file_doc.cloud_url or file_doc.file.name)
    
    @transaction.atomic
    def delete_file(self, file_doc, user, permanent=False):
        """Delete file (soft delete by default)"""
        
        if file_doc.owner != user:
            raise ValidationError("You can only delete your own files")
        
        if permanent:
            # Delete from storage
            try:
                if file_doc.storage_backend == 'local':
                    self.storage_service.delete_file(file_doc.file.name)
                else:
                    self.storage_service.delete_file(file_doc.cloud_url or file_doc.file.name)
            except Exception as e:
                # Log error but don't fail the deletion
                pass
            
            # Delete from database
            file_doc.delete()
        else:
            # Soft delete
            file_doc.is_deleted = True
            file_doc.deleted_at = timezone.now()
            file_doc.is_active = False
            file_doc.save()
        
        # Log activity
        FileActivity.objects.create(
            file=file_doc,
            user=user,
            action='delete',
            details={'permanent': permanent}
        )
    
    def move_file(self, file_doc, user, new_folder):
        """Move file to a different folder"""
        
        if file_doc.owner != user:
            raise ValidationError("You can only move your own files")
        
        old_folder = file_doc.folder
        file_doc.folder = new_folder
        file_doc.save()
        
        # Log activity
        FileActivity.objects.create(
            file=file_doc,
            user=user,
            action='move',
            details={
                'old_folder': old_folder.name if old_folder else None,
                'new_folder': new_folder.name if new_folder else None
            }
        )
    
    def can_access_file(self, file_doc, user):
        """Check if user can access the file"""
        if file_doc.owner == user:
            return True
        if file_doc.is_public:
            return True
        if file_doc.shared_with.filter(id=user.id).exists():
            return True
        return False
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_user_storage_usage(self, user):
        """Get total storage usage for user"""
        total_size = FileDocument.objects.filter(
            owner=user, 
            is_active=True
        ).aggregate(
            total=models.Sum('file_size')
        )['total'] or 0
        
        return total_size
    
    def search_files(self, user, query=None, category=None, file_type=None, folder=None, tags=None):
        """Search user's files"""
        queryset = FileDocument.objects.filter(owner=user, is_active=True)
        
        if query:
            queryset = queryset.filter(
                models.Q(name__icontains=query) |
                models.Q(description__icontains=query) |
                models.Q(tags__icontains=query)
            )
        
        if category:
            queryset = queryset.filter(category=category)
        
        if file_type:
            queryset = queryset.filter(file_type__icontains=file_type)
        
        if folder:
            queryset = queryset.filter(folder=folder)
        
        if tags:
            for tag in tags.split(','):
                queryset = queryset.filter(tags__icontains=tag.strip())
        
        return queryset.order_by('-created_at')