# PDF Scanning Views
import io
import uuid
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
import base64
import json
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from django.http import JsonResponse
from django.contrib import messages
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from .models import FileDocument, FileFolder, FileCategory
from .services.file_service import FileService


class DocumentScannerView(LoginRequiredMixin, View):
    def get(self, request):
        """Display the document scanner interface"""
        folders = FileFolder.objects.filter(owner=request.user)
        categories = FileCategory.objects.all()
        
        return render(request, 'file_manager/scanner.html', {
            'folders': folders,
            'categories': categories
        })

    def post(self, request):
        """Process scanned images and create PDF"""
        try:
            data = json.loads(request.body)
            images_data = data.get('images', [])
            document_name = data.get('name', f'Scanned_Document_{uuid.uuid4().hex[:8]}')
            folder_id = data.get('folder')
            category_id = data.get('category')
            description = data.get('description', '')
            
            if not images_data:
                return JsonResponse({'success': False, 'error': 'No images provided'})
            
            # Generate PDF from scanned images
            pdf_buffer = self.create_pdf_from_images(images_data)
            
            # Create file record
            folder = None
            if folder_id:
                try:
                    folder = FileFolder.objects.get(id=folder_id, owner=request.user)
                except FileFolder.DoesNotExist:
                    pass
            
            category = None
            if category_id:
                try:
                    category = FileCategory.objects.get(id=category_id)
                except FileCategory.DoesNotExist:
                    pass
            
            # Create FileDocument
            file_doc = FileDocument.objects.create(
                name=f"{document_name}.pdf",
                original_name=f"{document_name}.pdf",
                description=description,
                owner=request.user,
                folder=folder,
                category=category,
                file_type='application/pdf',
                file_extension='.pdf',
                file_size=len(pdf_buffer.getvalue()),
                storage_backend='local'
            )
            
            # Save PDF file
            file_path = f"files/{request.user.id}/scanned/{file_doc.id}.pdf"
            file_name = default_storage.save(file_path, ContentFile(pdf_buffer.getvalue()))
            file_doc.file.name = file_name
            file_doc.save()
            
            # Log activity
            from .models import FileActivity
            FileActivity.objects.create(
                file=file_doc,
                user=request.user,
                action='upload',
                details={'method': 'scanner', 'pages': len(images_data)},
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return JsonResponse({
                'success': True,
                'file_id': str(file_doc.id),
                'file_name': file_doc.name,
                'file_url': file_doc.file.url if hasattr(file_doc.file, 'url') else None,
                'message': f'Successfully scanned {len(images_data)} page(s) to PDF'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    def create_pdf_from_images(self, images_data):
        """Convert base64 image data to PDF"""
        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        page_width, page_height = A4
        
        for i, image_data in enumerate(images_data):
            if i > 0:  # Add new page for subsequent images
                pdf.showPage()
            
            try:
                # Remove data URL prefix if present
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                
                # Decode base64 image
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
                
                # Convert to RGB if necessary
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Calculate scaling to fit page
                img_width, img_height = image.size
                scale_x = page_width / img_width
                scale_y = page_height / img_height
                scale = min(scale_x, scale_y) * 0.9  # 90% of page size for margins
                
                new_width = img_width * scale
                new_height = img_height * scale
                
                # Center image on page
                x_offset = (page_width - new_width) / 2
                y_offset = (page_height - new_height) / 2
                
                # Save image temporarily
                img_buffer = io.BytesIO()
                image.save(img_buffer, format='JPEG', quality=85)
                img_buffer.seek(0)
                
                # Draw image on PDF
                pdf.drawInlineImage(
                    img_buffer,
                    x_offset, y_offset,
                    width=new_width,
                    height=new_height
                )
                
            except Exception as e:
                # If image processing fails, add a text note
                pdf.drawString(50, page_height - 50, f"Error processing image {i+1}: {str(e)}")
        
        pdf.save()
        buffer.seek(0)
        return buffer


class ScanHistoryView(LoginRequiredMixin, View):
    def get(self, request):
        """Display scanning history"""
        scanned_files = FileDocument.objects.filter(
            owner=request.user,
            file_type='application/pdf',
            activities__action='upload',
            activities__details__method='scanner'
        ).distinct().order_by('-created_at')[:20]
        
        return render(request, 'file_manager/scan_history.html', {
            'scanned_files': scanned_files
        })


@login_required
def quick_scan_api(request):
    """Quick scan API for single page documents"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST method required'})
    
    try:
        data = json.loads(request.body)
        image_data = data.get('image')
        
        if not image_data:
            return JsonResponse({'success': False, 'error': 'No image data provided'})
        
        # Create quick scan PDF
        scanner_view = DocumentScannerView()
        pdf_buffer = scanner_view.create_pdf_from_images([image_data])
        
        # Create temporary file
        quick_scan_name = f"QuickScan_{uuid.uuid4().hex[:8]}.pdf"
        
        file_doc = FileDocument.objects.create(
            name=quick_scan_name,
            original_name=quick_scan_name,
            description="Quick scan document",
            owner=request.user,
            file_type='application/pdf',
            file_extension='.pdf',
            file_size=len(pdf_buffer.getvalue()),
            storage_backend='local'
        )
        
        # Save file
        file_path = f"files/{request.user.id}/quick_scans/{file_doc.id}.pdf"
        file_name = default_storage.save(file_path, ContentFile(pdf_buffer.getvalue()))
        file_doc.file.name = file_name
        file_doc.save()
        
        return JsonResponse({
            'success': True,
            'file_id': str(file_doc.id),
            'download_url': f'/files/{file_doc.id}/download/',
            'message': 'Quick scan completed successfully'
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
