# Additional views to be added to views.py

from django.shortcuts import get_object_or_404, redirect
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from django.http import JsonResponse
from django.contrib import messages
import json
from .models import FileFolder

class FolderDeleteView(LoginRequiredMixin, View):
    def post(self, request, folder_id):
        folder = get_object_or_404(
            FileFolder, 
            id=folder_id, 
            owner=request.user
        )
        
        try:
            folder_name = folder.name
            folder.delete()
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f'Folder "{folder_name}" deleted successfully'
                })
            
            messages.success(request, f'Folder "{folder_name}" deleted successfully')
            return redirect('file_manager:folder_list')
            
        except Exception as e:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': str(e)})
            messages.error(request, f'Delete failed: {str(e)}')
            return redirect('file_manager:folder_list')

class FolderRenameView(LoginRequiredMixin, View):
    def post(self, request, folder_id):
        folder = get_object_or_404(
            FileFolder, 
            id=folder_id, 
            owner=request.user
        )
        
        try:
            data = json.loads(request.body)
            new_name = data.get('name', '').strip()
            
            if not new_name:
                return JsonResponse({'success': False, 'error': 'Folder name is required'})
            
            old_name = folder.name
            folder.name = new_name
            folder.save()
            
            return JsonResponse({
                'success': True,
                'message': f'Folder renamed from "{old_name}" to "{new_name}"'
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
