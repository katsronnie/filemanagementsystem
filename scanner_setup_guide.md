# Desktop Scanner Setup Guide

## Option 1: Dynamsoft Web TWAIN (Professional Solution)

### Step 1: Get License Key
1. Visit: https://www.dynamsoft.com/web-twain/
2. Sign up for free trial or purchase license
3. Get your license key

### Step 2: Configure in Template
Replace in scanner.html:
```html
<script src="https://cdn.jsdelivr.net/npm/dynamsoft-web-twain@18.0.0/dist/dynamsoft.webtwain.min.js"></script>
<script>
// Add your license key
Dynamsoft.DWT.ProductKey = "YOUR_LICENSE_KEY_HERE";
Dynamsoft.DWT.ResourcesPath = "https://cdn.jsdelivr.net/npm/dynamsoft-web-twain@18.0.0/dist/";
</script>
```

### Step 3: Install Service
Users need to install Dynamsoft Service on their computers:
- Download from: https://www.dynamsoft.com/web-twain/downloads
- Install the service (one-time setup per computer)
- Service runs in background to bridge browser-scanner communication

## Option 2: Native Desktop App Integration

### Create Desktop Scanner Bridge
```python
# scanner_bridge.py - Run this as a separate desktop application
import tkinter as tk
from tkinter import filedialog
import requests
import base64
from PIL import Image
import io

class ScannerBridge:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("File Manager Scanner Bridge")
        
    def scan_document(self):
        try:
            # Use system scanner dialog
            import win32print
            import win32ui
            # Scanner integration code here
            pass
        except ImportError:
            # Fallback to file selection
            self.select_images()
    
    def select_images(self):
        files = filedialog.askopenfilenames(
            title="Select scanned images",
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff")]
        )
        
        if files:
            self.upload_to_filemanager(files)
    
    def upload_to_filemanager(self, files):
        # Send to your file manager via API
        images = []
        for file_path in files:
            with open(file_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode()
                images.append(f"data:image/jpeg;base64,{image_data}")
        
        # POST to your scanner endpoint
        requests.post("http://localhost:8000/scanner/", 
                     json={"images": images})

if __name__ == "__main__":
    app = ScannerBridge()
    app.root.mainloop()
```

## Option 3: Manufacturer Scanner Software

### Windows (WIA - Windows Image Acquisition)
```python
# Add to scanning_views.py
import subprocess
import tempfile
import os

def scan_with_wia():
    """Use Windows built-in scanner interface"""
    try:
        # Open Windows Scanner dialog
        result = subprocess.run([
            "rundll32.exe", 
            "wiaacmgr.cpl",
            ",ScannerAcquireWizard"
        ], capture_output=True)
        
        # Check for scanned files in temp directory
        # Process and return
        
    except Exception as e:
        return {"error": str(e)}
```

### macOS (ImageCaptureCore)
```python
# macOS scanner integration
def scan_with_macos():
    """Use macOS Image Capture"""
    try:
        # Use osascript to trigger Image Capture
        script = '''
        tell application "Image Capture"
            activate
        end tell
        '''
        subprocess.run(["osascript", "-e", script])
    except Exception as e:
        return {"error": str(e)}
```

## Option 4: Simple File Upload Alternative

### Enhanced Upload Interface
Replace scanner interface with enhanced upload:

```html
<!-- In scanner.html -->
<div class="enhanced-upload-area">
    <h4>Scan with Your Scanner Software</h4>
    <ol>
        <li>Use your scanner's software to scan documents</li>
        <li>Save as JPG/PNG files</li>
        <li>Upload the scanned images here</li>
        <li>We'll convert them to PDF automatically</li>
    </ol>
    
    <div class="upload-zone" onclick="document.getElementById('scanner-upload').click()">
        <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
        <h5>Upload Scanned Images</h5>
        <p>Click or drag scanned images here</p>
        <input type="file" id="scanner-upload" multiple accept="image/*" style="display: none;">
    </div>
</div>
```

## Recommended Approach

For most users, I recommend:

1. **Mobile/Tablet**: Use camera scanning (works perfectly)
2. **Desktop**: 
   - Option A: Use scanner software → save files → upload to file manager
   - Option B: Set up Dynamsoft Web TWAIN for direct integration
   - Option C: Create desktop bridge application

The camera scanning works immediately and is perfect for most document scanning needs!
