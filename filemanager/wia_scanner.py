# your_app/wia_scanner.py
import pythoncom
import wia
import base64
import os
from django.http import JsonResponse

def scan_with_wia(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST allowed'}, status=405)
    
    try:
        # Initialize COM
        pythoncom.CoInitialize()
        
        # Create WIA instance
        wia_dev_mgr = wia.DevMgr()
        
        # Select the first available scanner
        devices = wia_dev_mgr.Devices
        if not devices:
            return JsonResponse({'success': False, 'error': 'No scanners found'}, status=400)
            
        scanner = devices[0]
        
        # Scan with default settings
        item = scanner.Items[1]
        image = item.Transfer()
        
        # Save to temporary file
        temp_file = "temp_scan.jpg"
        image.SaveFile(temp_file)
        
        # Read the image data
        with open(temp_file, "rb") as f:
            image_data = f.read()
        
        # Convert to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Clean up
        os.remove(temp_file)
        pythoncom.CoUninitialize()
        
        return JsonResponse({
            'success': True,
            'image': image_base64,
            'message': 'Scan completed successfully'
        })
        
    except Exception as e:
        pythoncom.CoUninitialize()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)