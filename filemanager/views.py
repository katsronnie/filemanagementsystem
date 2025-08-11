from django.shortcuts import render, redirect
import re
import uuid
import calendar
import win32com.client
from django.contrib.auth import authenticate, login
from django.views import View
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import base64
import binascii  
import json
from pypdf import PdfMerger
from django.core.files.base import ContentFile
import os
from datetime import datetime
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from datetime import datetime
from .models import *
import math
import time
from django.views.decorators.http import require_GET
from django.db.models import Sum
from datetime import timedelta
from django.utils import timezone
from django.contrib import messages
from django.db import IntegrityError
from django.utils.timezone import localtime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Q
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import pythoncom
import base64
from uuid import uuid4
from PIL import Image,ImageOps
import logging
import tempfile





logger = logging.getLogger(__name__)
User = get_user_model()

@require_GET
@csrf_exempt
def get_scanners(request):
    """Return list of available scanners with better error handling"""
    try:
        pythoncom.CoInitialize()
        
        try:
            wia_manager = win32com.client.Dispatch("WIA.DeviceManager")
            if wia_manager is None:
                return JsonResponse({
                    'success': False, 
                    'error': 'Failed to initialize WIA DeviceManager'
                }, status=500)
            
            devices = wia_manager.DeviceInfos
            scanners = []
            
            # Explicitly check for scanner devices (type 1)
            for i in range(1, devices.Count + 1):
                device = devices.Item(i)
                if device.Type == 1:  # Scanner device type
                    scanners.append({
                        'id': i,
                        'name': device.Properties.Item("Name").Value,
                        'description': device.Properties.Item("Description").Value 
                            if device.Properties.Exists("Description") else ""
                    })
            
            if not scanners:
                return JsonResponse({
                    'success': False,
                    'error': 'No scanners found. Please check: 1. Scanner is powered on 2. Drivers are installed 3. Scanner is not in use by another application'
                }, status=404)
            
            return JsonResponse({'success': True, 'scanners': scanners})
            
        except pythoncom.com_error as e:
            return JsonResponse({
                'success': False,
                'error': f'WIA COM Error: {e.excepinfo[2]}',
                'hint': 'Make sure Windows Image Acquisition service is running'
            }, status=500)
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }, status=500)
            
    finally:
        pythoncom.CoUninitialize()

TEMP_SCAN_DIR = "/path/to/temp/scan/dir" 

if not os.path.exists(TEMP_SCAN_DIR):
    os.makedirs(TEMP_SCAN_DIR)
    
@require_POST
@csrf_exempt
def scan_document(request):
    pythoncom.CoInitialize()  # Initialize COM first
    wia_manager = None
    device = None
    item = None

    def safe_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    try:
        scanner_id = safe_int(request.POST.get('scanner_id'), 1)
        dpi = safe_int(request.POST.get('dpi'), 300)
        color_mode = request.POST.get('color_mode', 'Color')
        auto_deskew = request.POST.get('auto_deskew', 'false').lower() == 'true'

        wia_manager = win32com.client.Dispatch("WIA.DeviceManager")

        if wia_manager.DeviceInfos.Count < scanner_id:
            return JsonResponse({
                'success': False,
                'error': f'Scanner ID {scanner_id} not found',
                'available_scanners': wia_manager.DeviceInfos.Count
            }, status=400)

        device = wia_manager.DeviceInfos.Item(scanner_id).Connect()
        item = device.Items.Item(1)

        # Configure scanner settings
        try:
            item.Properties.Item("Horizontal Resolution").Value = dpi
            item.Properties.Item("Vertical Resolution").Value = dpi

            if color_mode == 'Grayscale':
                item.Properties.Item("Current Intent").Value = 1
            elif color_mode == 'BlackAndWhite':
                item.Properties.Item("Current Intent").Value = 4
            else:  # Color
                item.Properties.Item("Current Intent").Value = 2
        except Exception as config_error:
            logger.warning(f"Scanner config error: {config_error}")

        # Retry scanning if device is busy
        max_attempts = 6
        for attempt in range(max_attempts):
            try:
                image = item.Transfer()
                break
            except pythoncom.com_error as e:
                error_msg = e.excepinfo[2] if e.excepinfo else str(e)
                if "device is busy" in error_msg.lower() and attempt < max_attempts - 1:
                    logger.warning(f"WIA device busy, retrying scan (attempt {attempt + 1})...")
                    time.sleep(7)
                    continue
                else:
                    raise

        # Generate unique temp file paths
        temp_dir = tempfile.gettempdir()
        jpg_path = os.path.join(temp_dir, f"{uuid.uuid4()}.jpg")
        pdf_path = os.path.join(temp_dir, f"{uuid.uuid4()}.pdf")

        # Save scan to JPEG
        image.SaveFile(jpg_path)

        # Convert to PDF and optionally deskew
        pil_image = Image.open(jpg_path)
        if auto_deskew:
            try:
                pil_image = ImageOps.exif_transpose(pil_image)
            except Exception as deskew_error:
                logger.warning(f"Deskew failed: {deskew_error}")

        pil_image.convert("RGB").save(pdf_path, "PDF", resolution=100.0)
        pil_image.close()  # Close image to release the file handle

        # Encode PDF to base64
        with open(pdf_path, 'rb') as pdf_file:
            pdf_data = pdf_file.read()
            base64_pdf = base64.b64encode(pdf_data).decode('utf-8')

        # Clean up temp files
        for f in [jpg_path, pdf_path]:
            try:
                os.unlink(f)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {f}: {e}")

        return JsonResponse({
            'success': True,
            'image': f"data:application/pdf;base64,{base64_pdf}",
            'file_name': f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        })

    except pythoncom.com_error as e:
        err_msg = e.excepinfo[2] if e.excepinfo else str(e)
        logger.error(f"Scanner communication error: {err_msg}")
        return JsonResponse({
            'success': False,
            'error': f"Scanner communication error: {err_msg}",
            'type': 'scanner_error'
        }, status=500)

    except Exception as e:
        logger.error(f"Scan error: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': f"Scan failed: {str(e)}",
            'type': 'unexpected_error'
        }, status=500)

    finally:
        # Release COM objects and uninitialize COM library
        item = None
        device = None
        wia_manager = None
        pythoncom.CoUninitialize()
        
TEMP_SCAN_DIR = "/path/to/temp/scan/dir"  

@require_POST
@csrf_exempt
def finalize_scan(request):
    """Combine multiple scanned PDF pages into one PDF using pypdf."""

    page_ids = request.POST.getlist("page_ids[]")  # List of PDF filenames (e.g. ['page1.pdf', 'page2.pdf'])

    if not page_ids:
        return JsonResponse({"success": False, "error": "No pages provided to merge"}, status=400)

    merger = PdfMerger()

    try:
        for pid in page_ids:
            path = os.path.join(TEMP_SCAN_DIR, pid)
            if not os.path.exists(path):
                return JsonResponse({"success": False, "error": f"Page {pid} not found"}, status=400)
            merger.append(path)

        combined_pdf_path = os.path.join(TEMP_SCAN_DIR, f"combined_{uuid.uuid4()}.pdf")
        merger.write(combined_pdf_path)
        merger.close()

        with open(combined_pdf_path, "rb") as f:
            base64_pdf = base64.b64encode(f.read()).decode("utf-8")

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Failed to merge PDFs: {str(e)}"}, status=500)

    finally:
        # Cleanup individual pages if needed
        for pid in page_ids:
            try:
                os.unlink(os.path.join(TEMP_SCAN_DIR, pid))
            except Exception:
                pass
        # Cleanup combined PDF file as well, or keep if you want
        try:
            os.unlink(combined_pdf_path)
        except Exception:
            pass

    return JsonResponse({
        "success": True,
        "image": f"data:application/pdf;base64,{base64_pdf}",
        "file_name": f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    })
   
    
@login_required
def file_upload_view(request):
    if request.method == 'POST':
        file = None

        # Handle scan data
        if 'scan_data' in request.POST and request.POST['scan_data']:
            # Strip the prefix if it exists
            scan_data = re.sub(r'^data:image/\w+;base64,', '', request.POST['scan_data'])
            try:
                file_data = base64.b64decode(scan_data)
            except Exception as e:
                return render(request, 'file_upload.html', {
                    'error': f'Invalid scan data: {e}',
                    'categories': Category.objects.all(),
                    'years': list(range(datetime.now().year, datetime.now().year - 11, -1)),
                    'months': [{'value': str(i).zfill(2), 'label': datetime(1900, i, 1).strftime('%B')} for i in range(1, 13)],
                    'dates': [str(i).zfill(2) for i in range(1, 32)],
                })

            # Use the custom name from the frontend if available
            custom_name = request.POST.get('scan_file_name') or f"scanned_{uuid4().hex}.jpg"
            file = ContentFile(file_data, name=custom_name)

        else:
            file = request.FILES.get('file')

        if not file:
            return render(request, 'file_upload.html', {
                'error': 'No file was uploaded.',
                'categories': Category.objects.all(),
                'years': list(range(datetime.now().year, datetime.now().year - 11, -1)),
                'months': [{'value': str(i).zfill(2), 'label': datetime(1900, i, 1).strftime('%B')} for i in range(1, 13)],
                'dates': [str(i).zfill(2) for i in range(1, 32)],
            })

        # Get form data
        category_name = request.POST.get('category')
        year = int(request.POST.get('year'))
        month = int(request.POST.get('month'))
        date = int(request.POST.get('date'))
        description = request.POST.get('description', '')

        # Get category
        try:
            category = Category.objects.get(name=category_name)
        except Category.DoesNotExist:
            return render(request, 'file_upload.html', {
                'error': 'Invalid category selected.',
                'categories': Category.objects.all(),
                'years': list(range(datetime.now().year, datetime.now().year - 11, -1)),
                'months': [{'value': str(i).zfill(2), 'label': datetime(1900, i, 1).strftime('%B')} for i in range(1, 13)],
                'dates': [str(i).zfill(2) for i in range(1, 32)],
            })

        # Create folder structure
        year_folder, _ = YearFolder.objects.get_or_create(category=category, year=year)
        month_folder, _ = MonthFolder.objects.get_or_create(year_folder=year_folder, month=month)
        date_folder, _ = DateFolder.objects.get_or_create(month_folder=month_folder, date=date)

        # Create record
        medical_file = MedicalFile.objects.create(
            name=file.name,
            file=file,
            uploaded_by=request.user,
            file_type='PDF' if file.name.lower().endswith('.pdf') else 'OTH',
            description=description,
            size=file.size,
            date_folder=date_folder,
            category=category,
        )

        return render(request, 'file_upload.html', {
            'success': 'Successfully uploaded the file.',
            'categories': Category.objects.all(),
            'years': list(range(datetime.now().year, datetime.now().year - 11, -1)),
            'months': [{'value': str(i).zfill(2), 'label': datetime(1900, i, 1).strftime('%B')} for i in range(1, 13)],
            'dates': [str(i).zfill(2) for i in range(1, 32)],
        })

    # GET request
    return render(request, 'file_upload.html', {
        'categories': Category.objects.all(),
        'years': list(range(datetime.now().year, datetime.now().year - 11, -1)),
        'months': [{'value': str(i).zfill(2), 'label': datetime(1900, i, 1).strftime('%B')} for i in range(1, 13)],
        'dates': [str(i).zfill(2) for i in range(1, 32)],
    })
    
@csrf_exempt
@require_http_methods(["POST"])
def upload_file_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        data = json.loads(request.body)

        # Validate required fields
        required_fields = ['filename', 'fileContent', 'category', 'year', 'month', 'date', 'mimetype', 'filesize']
        for field in required_fields:
            if field not in data:
                return JsonResponse({'error': f'Missing required field: {field}'}, status=400)

        # Get and validate category
        try:
            category = Category.objects.get(name=data['category'])
        except Category.DoesNotExist:
            return JsonResponse({'error': 'Invalid category'}, status=400)

        # Check permissions
        if not request.user.is_staff and category.department != request.user.department:
            return JsonResponse({'error': 'Permission denied for this category'}, status=403)

        # Decode file content
        try:
            file_content = data['fileContent']
            if file_content.startswith('data:'):
                file_content = file_content.split(',')[1]
            file_bytes = base64.b64decode(file_content)
        except (binascii.Error, ValueError):
            return JsonResponse({'error': 'Invalid base64 content'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Error decoding file: {str(e)}'}, status=400)

        # Create file object
        file_obj = ContentFile(file_bytes, name=data['filename'])

        # Determine file type
        def get_file_type(mimetype, filename):
            mimetype = mimetype.lower()
            filename = filename.lower()
            if 'pdf' in mimetype or filename.endswith('.pdf'):
                return 'PDF'
            elif 'word' in mimetype or filename.endswith(('.doc', '.docx')):
                return 'DOC'
            elif 'excel' in mimetype or filename.endswith(('.xls', '.xlsx')):
                return 'XLS'
            elif 'image' in mimetype or filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
                return 'IMG'
            elif 'video' in mimetype or filename.endswith(('.mp4', '.mov', '.avi')):
                return 'VID'
            elif 'audio' in mimetype or filename.endswith(('.mp3', '.wav')):
                return 'AUD'
            return 'OTH'

        file_type = get_file_type(data['mimetype'], data['filename'])

        # Create folder structure
        try:
            day = int(data['date'])
            year = int(data['year'])
            month = int(data['month'])

            year_folder, _ = YearFolder.objects.get_or_create(
                category=category,  # Link to category
                year=year
            )
            
            month_folder, _ = MonthFolder.objects.get_or_create(
                year_folder=year_folder,
                month=month
            )
            
            date_folder, _ = DateFolder.objects.get_or_create(
                month_folder=month_folder,
                date=day
            )
        except ValueError as e:
            return JsonResponse({'error': f'Invalid date format: {str(e)}'}, status=400)

        # Create and save MedicalFile with category association
        medical_file = MedicalFile(
            name=data['filename'],
            file=file_obj,
            uploaded_by=request.user,
            file_type=file_type,
            description=data.get('description', ''),
            size=data['filesize'],
            date_folder=date_folder,
            category=category  # Direct category association
        )

        medical_file.save()

        return JsonResponse({
            'success': True,
            'message': 'File uploaded successfully',
            'file_url': medical_file.file.url,
            'file_id': medical_file.id,
            'category': category.name  # Include category in response
        })

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
class LoginView(View):
    def get(self, request):
        return render(request, 'login.html', {'form': YourLoginForm()})

    def post(self, request):
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            
            # Check if user has a department and redirect accordingly
            if hasattr(user, 'department'):  # Assuming user has a department field
                if user.department.code == 'ADMINISTRATION':
                    return redirect('dashboard')  # admin dashboard
                else:
                    return redirect('user_dashboard')  # regular user dashboard
            else:
                # Handle users without department assignment
                return redirect('user_dashboard')
        else:
            context = {
                'form': YourLoginForm(request.POST),
                'error': 'Invalid username or password',
            }
            return render(request, 'login.html', context)


class DashboardView(View):
    template_name = 'dashboard.html'

    def get(self, request):
        if not request.user.is_authenticated:
            return redirect('login')
        
        # Determine accessible categories based on user's department
        if request.user.is_staff or request.user.department == 'ADMINISTRATION':
            categories = Category.objects.all()
            is_admin = True
        else:
            categories = Category.objects.filter(department=request.user.department)
            is_admin = False
        
        # Prepare category stats (only for accessible categories)
        category_stats = []
        for category in categories:
            file_count = MedicalFile.objects.filter(category=category).count()
            category_stats.append({
                'name': category.name,
                'description': category.department.name if category.department else '',
                'file_count': file_count
            })
        
        # Get total file count (only for accessible categories)
        total_files = MedicalFile.objects.filter(
            category__in=categories
        ).count()
        
        # Get storage used (only for accessible categories)
        storage_used = MedicalFile.objects.filter(
            category__in=categories
        ).aggregate(total_size=Sum('size'))['total_size'] or 0
        
        # Get recent uploads (only for accessible categories)
        recent_uploads = MedicalFile.objects.filter(
            category__in=categories,
            uploaded_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-uploaded_at')[:10]
        
        context = {
            'total_files': total_files,
            'category_count': categories.count(),
            'storage_used': storage_used,
            'category_stats': category_stats,
            'recent_uploads': recent_uploads,
            'today_users': User.objects.filter(
                last_login__date=timezone.now().date()
            ).count() if is_admin else None,  # Only show to admins
            'is_admin': is_admin,  # Pass admin flag to template
        }
        
        return render(request, self.template_name, context)
    
@require_GET
def dashboard_stats(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    # Get accessible categories
    if request.user.is_staff:
        categories = Category.objects.all()
    else:
        categories = Category.objects.filter(department=request.user.department)
    
    # Prepare category stats
    category_stats = []
    for category in categories:
        file_count = MedicalFile.objects.filter(category=category).count()
        category_stats.append({
            'name': category.name,
            'description': category.department.name if category.department else '',
            'file_count': file_count
        })
    
    # Get total file count
    total_files = MedicalFile.objects.filter(
        category__in=categories
    ).count()
    
    # Get storage used (in bytes)
    storage_used = MedicalFile.objects.filter(
        category__in=categories
    ).aggregate(total_size=Sum('size'))['total_size'] or 0
    
    # Format storage for display
    formatted_storage = format_file_size(storage_used)
    
    # Get recent uploads (last 7 days)
    recent_uploads = MedicalFile.objects.filter(
        category__in=categories,
        uploaded_at__gte=timezone.now() - timedelta(days=7)
    ).order_by('-uploaded_at')[:10]
    
    recent_uploads_list = []
    for file in recent_uploads:
        recent_uploads_list.append({
            'name': file.name,
            'category': file.category.name if file.category else 'Uncategorized',
            'uploaded_by': file.uploaded_by.get_full_name() or file.uploaded_by.username,
            'uploaded_at': file.uploaded_at.strftime('%b %d, %Y %H:%M'),
            'size': format_file_size(file.size)
        })
    
    return JsonResponse({
        'total_files': total_files,
        'category_count': categories.count(),
        'storage_used': formatted_storage,
        'today_users': User.objects.filter(
            last_login__date=timezone.now().date()
        ).count(),
        'category_stats': category_stats,
        'recent_uploads': recent_uploads_list,
    })


@login_required
def file_browser_view(request):
    """Render the main file browser page with user-specific categories"""
    if request.user.is_staff:
        categories = Category.objects.all()
    else:
        categories = Category.objects.filter(department=request.user.department)
    
    current_year = datetime.now().year
    years = list(range(current_year, current_year - 6, -1))
    
    context = {
        'categories': categories,
        'years': years,
    }
    return render(request, 'browser.html', context)

@login_required
@require_http_methods(["GET"])
def get_file_structure(request):
    """API endpoint to get the file structure"""
    try:
        # Get categories accessible to the user
        if request.user.is_staff:
            categories = Category.objects.all()
        else:
            categories = Category.objects.filter(department=request.user.department)
        
        structure = {}
        
        for category in categories:
            # Get all year folders for this category
            year_folders = YearFolder.objects.filter(category=category).annotate(
                file_count=Count('month_folders__date_folders__files')
            )
            
            if not year_folders.exists():
                continue
                
            structure[category.name] = {}
            
            for year_folder in year_folders:
                year_str = str(year_folder.year)
                structure[category.name][year_str] = {}
                
                # Get all month folders for this year
                month_folders = MonthFolder.objects.filter(year_folder=year_folder).annotate(
                    file_count=Count('date_folders__files')
                )
                
                for month_folder in month_folders:
                    month_str = str(month_folder.month).zfill(2)
                    structure[category.name][year_str][month_str] = []
                    
                    # Get all date folders for this month
                    date_folders = DateFolder.objects.filter(month_folder=month_folder).annotate(
                        file_count=Count('files')
                    ).order_by('-date')
                    
                    for date_folder in date_folders:
                        date_str = str(date_folder.date.day).zfill(2)
                        if date_folder.file_count > 0:
                            structure[category.name][year_str][month_str].append(date_str)
                    
                    # Remove empty months
                    if not structure[category.name][year_str][month_str]:
                        del structure[category.name][year_str][month_str]
                
                # Remove empty years
                if not structure[category.name][year_str]:
                    del structure[category.name][year_str]
        
        return JsonResponse({'structure': structure})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_files_by_date(request):
    """API endpoint to get files with flexible filters"""
    try:
        # Get base queryset with permission check
        if request.user.is_staff:
            files = MedicalFile.objects.all()
        else:
            files = MedicalFile.objects.filter(
                category__department=request.user.department
            )
        
        # Apply filters
        if 'category' in request.GET and request.GET['category']:
            files = files.filter(category__name=request.GET['category'])
        
        if 'year' in request.GET and request.GET['year']:
            files = files.filter(date_folder__month_folder__year_folder__year=request.GET['year'])
            
            if 'month' in request.GET and request.GET['month']:
                files = files.filter(date_folder__month_folder__month=request.GET['month'])
                
                if 'date' in request.GET and request.GET['date']:
                    files = files.filter(date_folder__date=request.GET['date'])
        
        # Search functionality
        if 'search' in request.GET and request.GET['search']:
            search_term = request.GET['search']
            files = files.filter(
                Q(name__icontains=search_term) |
                Q(description__icontains=search_term)
            )
        
        # Pagination
        paginator = Paginator(files.order_by('-uploaded_at'), 10)
        page = request.GET.get('page', 1)
        
        try:
            page_files = paginator.page(page)
        except PageNotAnInteger:
            page_files = paginator.page(1)
        except EmptyPage:
            page_files = paginator.page(paginator.num_pages)
        
        # Prepare response
        files_list = []
        for file in page_files:
            files_list.append({
                'id': file.id,
                'filename': file.name,
                'filesize': file.file.size,
                'formatted_size': format_file_size(file.file.size),
                'mimetype': file.get_file_type_display(),
                'created_at': file.uploaded_at.isoformat(),
                'formatted_date': file.uploaded_at.strftime('%d/%m/%Y %I:%M %p'),
                'description': file.description,
                'filepath': file.file.url,
                'uploaded_by': file.uploaded_by.get_full_name() or file.uploaded_by.username,
                'can_delete': request.user.is_staff or file.uploaded_by == request.user,
                'category': file.category.name if file.category else 'Uncategorized',
                'year': file.date_folder.month_folder.year_folder.year,
                'month': file.date_folder.month_folder.month,
                'day': file.date_folder.date
            })
        
        return JsonResponse({
            'files': files_list,
            'pagination': {
                'total': paginator.count,
                'per_page': paginator.per_page,
                'current_page': page_files.number,
                'total_pages': paginator.num_pages
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["DELETE"])
def delete_file(request, file_id):
    """API endpoint to delete a file"""
    try:
        file = get_object_or_404(MedicalFile, id=file_id)
        
        # Check permissions
        if not request.user.is_staff and file.uploaded_by != request.user:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        
        # Delete the file
        file.file.delete()  # Deletes the actual file from storage
        file.delete()       # Deletes the database record
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["GET"])
def get_user_profile(request):
    """API endpoint to get current user's profile and permissions"""
    try:
        profile = {
            'role': 'admin' if request.user.is_staff else 'user',
            'department': request.user.get_department_display(),
            'department_code': request.user.department,
            'allowed_categories': ['all'] if request.user.is_staff else [request.user.get_department_display()]
        }
        
        return JsonResponse({'userProfile': profile})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def format_file_size(bytes):
    """Helper function to format file size"""
    if bytes == 0:
        return '0 Bytes'
    k = 1024
    sizes = ['Bytes', 'KB', 'MB', 'GB']
    i = int(math.floor(math.log(bytes) / math.log(k)))
    return f"{round(bytes / math.pow(k, i), 2)} {sizes[i]}"


class UserManagementView(View):
    def get(self, request):
        users_data = []
        users = User.objects.all().select_related('department')
        
        for user in users:
            latest_session = user.sessions.order_by('-login_time').first()
            login_time = localtime(latest_session.login_time).strftime("%d/%m/%Y %H:%M") if latest_session else "Never"
            logout_time = (
                localtime(latest_session.logout_time).strftime("%d/%m/%Y %H:%M")
                if latest_session and latest_session.logout_time
                else "Still Logged In" if latest_session else "N/A"
            )
            
            users_data.append({
                "username": user.username,
                "email": user.email,
                "department": user.department.name if user.department else '',
                "department_code": user.department.code if user.department else '',
                "is_approved": user.is_approved,
                "is_staff": user.is_staff,
                "created": localtime(user.date_joined).strftime("%d/%m/%Y"),
                "login": login_time,
                "logout": logout_time,
            })
            
        # Get all existing departments from database
        departments = Department.objects.all()
        
        # If no departments exist, create them from choices
        if not departments.exists():
            for code, name in Department.DEPARTMENT_CHOICES:
                Department.objects.create(code=code, name=name)
            departments = Department.objects.all()
            
        context = {
            "users": users_data,
            "departments": departments,  # Pass actual department objects
            "department_choices": Department.DEPARTMENT_CHOICES,  # Pass the choices tuple
        }
        return render(request, 'usermanagement.html', context)
    
@csrf_exempt
def add_user_api(request):
    if request.method == 'POST':
        try:
            # Parse JSON data
            try:
                data = json.loads(request.body.decode('utf-8'))
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
            
            # Validate required fields
            required_fields = ['username', 'email', 'password', 'department']
            for field in required_fields:
                if field not in data:
                    return JsonResponse({'success': False, 'error': f'Missing required field: {field}'}, status=400)
            
            # Check if username already exists
            if User.objects.filter(username=data['username']).exists():
                return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)
            
            # Check if email already exists
            if User.objects.filter(email=data['email']).exists():
                return JsonResponse({'success': False, 'error': 'Email already exists'}, status=400)
            
            # Get department (using the code from choices)
            try:
                department = Department.objects.get(code=data['department'])
            except Department.DoesNotExist:
                return JsonResponse({
                    'success': False, 
                    'error': f"Invalid department code. Valid codes are: {[code for code, name in Department.DEPARTMENT_CHOICES]}"
                }, status=400)
            
            # Create the user
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                department=department,
                is_staff=data.get('is_staff', False),
                is_approved=data.get('is_approved', False)
            )
            
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'department': user.department.name,
                    'is_staff': user.is_staff,
                    'is_approved': user.is_approved
                }
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    return JsonResponse({'error': 'Invalid request method'}, status=405)

class CategoriesView(View):
    def get(self, request):
        categories = Category.objects.all().order_by('department', 'name')
        departments = Department.objects.all()  # Add this line
        return render(request, 'category.html', {
            'categories': categories,
            'departments': departments  # Add this to context
        })
    
    def post(self, request):
        name = request.POST.get('name')
        
        department_id = request.POST.get('department')  # This should be department ID
       
        
        try:
            department = Department.objects.get(id=department_id)  # Get Department instance
            Category.objects.create(
                name=name,
                
                department=department,  # Pass the instance, not the ID
                
            )
            messages.success(request, f'Category "{name}" has been added successfully!')
        except Department.DoesNotExist:
            messages.error(request, 'Selected department does not exist!')
        except IntegrityError:
            messages.error(request, f'A category with name "{name}" already exists!')
        except Exception as e:
            messages.error(request, f'Error creating category: {str(e)}')
        
        return redirect('categories')

    def put(self, request, category_id):
        category = get_object_or_404(Category, id=category_id)
        department_id = request.POST.get('department')
        
        try:
            department = Department.objects.get(id=department_id)
            category.name = request.POST.get('name')
            
            category.department = department  # Assign the instance
            
            category.save()
            messages.success(request, f'Category "{category.name}" has been updated successfully!')
        except Department.DoesNotExist:
            messages.error(request, 'Selected department does not exist!')
        except Exception as e:
            messages.error(request, f'Error updating category: {str(e)}')
        
        return redirect('categories')
    
    
@method_decorator(csrf_exempt, name='dispatch')  # For simplicity, or use csrf token properly
class AddUserView(View):
    def post(self, request):
        import json
        data = json.loads(request.body)

        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        department = data.get('department')

        if not (username and email and password and department):
            return JsonResponse({'success': False, 'error': 'Missing fields'}, status=400)

        # Check if username/email already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already exists'}, status=400)

        # Create user
        user = User.objects.create_user(username=username, email=email, password=password)
        
        # If you have department and is_approved fields on user model, set them:
        user.department = department
        user.is_approved = False
        user.save()

        # Return success and user data
        return JsonResponse({
            'success': True,
            'user': {
                'username': user.username,
                'email': user.email,
                'department': user.get_department_display() if hasattr(user, 'get_department_display') else user.department,
                'is_approved': user.is_approved,
                'last_login': None,
            }
        })
        
@login_required
def user_dashboard(request):
    """
    User dashboard view - shows only medical files relevant to the user's department
    """
    try:
        user = request.user
        user_department = getattr(user, 'department', None)
        
        # Initialize empty querysets
        categories = Category.objects.none()
        medical_files = MedicalFile.objects.none()
        department_name = "No Department Assigned"
        
        if user_department:
            # User has a department - filter content by department
            department_name = user_department.name
            categories = Category.objects.filter(department=user_department)
            medical_files = MedicalFile.objects.filter(category__department=user_department)
        
        # Calculate statistics
        total_files = medical_files.count()
        category_count = categories.count()
        storage_used = medical_files.aggregate(total_size=Sum('size'))['total_size'] or 0
        
        # Prepare category statistics
        category_stats = [
            {
                'name': category.name,
                
                'file_count': medical_files.filter(category=category).count()
            }
            for category in categories
        ]
        
        # Get recent uploads (limited to 10)
        recent_uploads = medical_files.select_related('category', 'uploaded_by').order_by('-uploaded_at')[:10]
        
        context = {
            'user': user,
            'total_files': total_files,
            'category_count': category_count,
            'storage_used': storage_used,
            'category_stats': category_stats,
            'recent_uploads': recent_uploads,
            'user_department': user_department,
            'department_name': department_name,
            'medical_files': medical_files,
        }
        
        return render(request, 'user_dashboard.html', context)
    
    except Exception as e:
        # Add error handling to help with debugging
        print(f"Error in user_dashboard: {str(e)}")
        # Return a simple error response or redirect
        return render(request, 'error.html', {'error_message': str(e)})

@login_required
def user_browser(request, year=None, month=None, day=None):
    """
    Hierarchical browser for medical files: Years → Months → Days → Files
    Now department-aware and using MedicalFile model
    """
    user = request.user
    user_department = getattr(user, 'department', None)
    
    # Get base queryset filtered by user's department
    if user_department:
        base_files = MedicalFile.objects.filter(category__department=user_department)
    else:
        base_files = MedicalFile.objects.none()
    
    context = {
        'current_year': year,
        'current_month': month,
        'current_day': day,
        'breadcrumbs': [],
        'department_name': user_department.name if user_department else "All Departments",
    }
    
    # Build breadcrumbs
    breadcrumbs = [{'name': 'Home', 'url': 'user_dashboard'}]
    
    if year is None:
        # Show years that have files (2015-current year)
        current_year = timezone.now().year
        years_data = []
        
        # Get distinct years with files
        years_with_files = base_files.dates('uploaded_at', 'year').order_by('-uploaded_at')
        
        for date in years_with_files:
            y = date.year
            file_count = base_files.filter(uploaded_at__year=y).count()
            years_data.append({
                'year': y,
                'file_count': file_count,
                'url': 'user_browser_year',
                'url_params': {'year': y}
            })
        
        context.update({
            'view_type': 'years',
            'years_data': years_data,
            'breadcrumbs': breadcrumbs,
        })
    
    elif month is None:
        # Show months for the selected year
        breadcrumbs.append({'name': str(year), 'url': 'user_browser_year', 'params': {'year': year}})
        
        months_data = []
        # Get distinct months with files for this year
        months_with_files = base_files.filter(uploaded_at__year=year).dates('uploaded_at', 'month').order_by('uploaded_at')
        
        for date in months_with_files:
            m = date.month
            month_name = calendar.month_name[m]
            file_count = base_files.filter(uploaded_at__year=year, uploaded_at__month=m).count()
            months_data.append({
                'month': m,
                'month_name': month_name,
                'file_count': file_count,
                'url': 'user_browser_month',
                'url_params': {'year': year, 'month': m}
            })
        
        context.update({
            'view_type': 'months',
            'months_data': months_data,
            'breadcrumbs': breadcrumbs,
        })
    
    elif day is None:
        # Show days for the selected year and month
        month_name = calendar.month_name[month]
        breadcrumbs.append({'name': str(year), 'url': 'user_browser_year', 'params': {'year': year}})
        breadcrumbs.append({'name': month_name, 'url': 'user_browser_month', 'params': {'year': year, 'month': month}})
        
        # Get distinct days with files for this month
        days_with_files = base_files.filter(
            uploaded_at__year=year,
            uploaded_at__month=month
        ).dates('uploaded_at', 'day').order_by('uploaded_at')
        
        days_data = []
        for date in days_with_files:
            d = date.day
            file_count = base_files.filter(
                uploaded_at__year=year,
                uploaded_at__month=month,
                uploaded_at__day=d
            ).count()
            days_data.append({
                'day': d,
                'file_count': file_count,
                'url': 'user_browser_day',
                'url_params': {'year': year, 'month': month, 'day': d}
            })
        
        context.update({
            'view_type': 'days',
            'days_data': days_data,
            'breadcrumbs': breadcrumbs,
            'month_name': month_name,
        })
    
    else:
        # Show files for the selected date
        month_name = calendar.month_name[month]
        breadcrumbs.append({'name': str(year), 'url': 'user_browser_year', 'params': {'year': year}})
        breadcrumbs.append({'name': month_name, 'url': 'user_browser_month', 'params': {'year': year, 'month': month}})
        breadcrumbs.append({'name': str(day), 'url': 'user_browser_day', 'params': {'year': year, 'month': month, 'day': day}})
        
        files = base_files.filter(
            uploaded_at__year=year,
            uploaded_at__month=month,
            uploaded_at__day=day
        ).select_related('category', 'uploaded_by').order_by('-uploaded_at')
        
        context.update({
            'view_type': 'files',
            'files': files,
            'breadcrumbs': breadcrumbs,
            'selected_date': f"{day} {month_name} {year}",
        })
    
    return render(request, 'user_browser.html', context)