// Scanner management
        let availableScanners = [];
        // Load available scanners
        function loadScanners() {
        const scannerSelect = document.getElementById('scannerSelect');
        scannerSelect.innerHTML = '<option value="">Loading scanners...</option>';
        
        fetch(SCAN_URL, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            scannerSelect.innerHTML = '';
            
            if (data.success) {
                availableScanners = data.scanners;
                
                if (availableScanners.length > 0) {
                    availableScanners.forEach(scanner => {
                        const option = document.createElement('option');
                        option.value = scanner.id;
                        option.textContent = scanner.name || `Scanner ${scanner.id}`;
                        scannerSelect.appendChild(option);
                    });
                    document.getElementById('scannerSettings').style.display = 'block';
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No scanners detected';
                    scannerSelect.appendChild(option);
                    showMessage('No scanners found. Please check scanner connection and drivers.', 'error');
                }
            } else {
                throw new Error(data.error || 'Failed to load scanners');
            }
        })
        
        }

        // Enhanced scan function
        async function performScan(retryCount = 0) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 3000; // 3 seconds

        const scanButton = document.getElementById('scanButton');
        scanButton.disabled = true;
        scanButton.innerHTML = '<span class="scanning-animation">🖨️</span> Scanning...';

        try {
            const formData = new FormData();
            formData.append('scanner_id', document.getElementById('scannerSelect').value || 1);
            formData.append('dpi', document.getElementById('dpiSelect').value);
            formData.append('color_mode', document.getElementById('colorModeSelect').value);
            formData.append('auto_deskew', document.getElementById('autoDeskewCheck').checked);
            formData.append('multi_page', document.getElementById('multiPageCheck').checked);
            formData.append('csrfmiddlewaretoken', getCookie('csrftoken'));

            const response = await fetch('/scan_document/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
            }

            const result = await response.json();

            if (!response.ok || !result.success) {
                if(result.error && result.error.includes('WIA device is busy') && retryCount < MAX_RETRIES) {
                    // Wait a bit and retry
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    return performScan(retryCount + 1);
                }
                throw new Error(result.error || 'Scan failed with unknown error');
            }

            addScannedDocument(result.image, result.file_name);
            showMessage('Scan completed successfully', 'success');

        } catch (error) {
            console.error('Scan error:', error);
            showMessage(error.message, 'error', 10000);
        } finally {
            scanButton.disabled = false;
            scanButton.innerHTML = '<span>🖨️</span> Scan Document';
        }
    }


        // Update scan button to use new function
        document.getElementById('scanButton').addEventListener('click', performScan);

        // Initialize scanners when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadScanners();
            
            // Show/hide scanner settings when scan tab is selected
            document.querySelectorAll('.upload-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    if (this.getAttribute('data-tab') === 'scan') {
                        document.getElementById('scannerSettings').style.display = 
                            availableScanners.length > 0 ? 'block' : 'none';
                    } else {
                        document.getElementById('scannerSettings').style.display = 'none';
                    }
                });
            });
        });
        // Tab switching functionality
        document.querySelectorAll('.upload-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                document.querySelectorAll('.form-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                const tabType = this.getAttribute('data-tab');
                if (tabType === 'upload') {
                    document.getElementById('uploadContent').classList.add('active');
                }
            });
        });

        // Initialize date pickers
        function initializeDatePickers() {
            // Populate year dropdown
            const yearSelect = document.getElementById('year');
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= currentYear - 10; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            }

            // Set up date change listeners
            document.getElementById('month').addEventListener('change', populateDates);
            document.getElementById('year').addEventListener('change', populateDates);
            document.getElementById('dateInput').addEventListener('change', syncDateInputs);
        }

        // Populate date dropdown based on month/year
        function populateDates() {
            const dateSelect = document.getElementById('date');
            const month = document.getElementById('month').value;
            const year = document.getElementById('year').value;
            
            dateSelect.innerHTML = '<option value="">Date</option>';
            
            if (month && year) {
                const daysInMonth = new Date(year, month, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const option = document.createElement('option');
                    option.value = day.toString().padStart(2, '0');
                    option.textContent = day;
                    dateSelect.appendChild(option);
                }
            }
        }

        // File upload functionality
        const fileInput = document.getElementById('fileInput');
        const fileDropZone = document.getElementById('fileDropZone');
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFile = document.getElementById('removeFile');

        fileDropZone.addEventListener('click', () => fileInput.click());

        fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDropZone.classList.add('dragover');
        });

        fileDropZone.addEventListener('dragleave', () => {
            fileDropZone.classList.remove('dragover');
        });

        fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        function handleFile(file) {
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            filePreview.style.display = 'block';
            
            // Update drop zone text
            const fileInputText = document.querySelector('.file-input-text');
            fileInputText.textContent = file.name;
        }

        removeFile.addEventListener('click', () => {
            fileInput.value = '';
            filePreview.style.display = 'none';
            document.querySelector('.file-input-text').textContent = 'No file chosen';
        });

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize scanner settings
            loadScanners();
            
            // Set up scan button
            document.getElementById('scanButton').addEventListener('click', performScan);
        });

        async function performScan() {
            const scanButton = document.getElementById('scanButton');
            scanButton.disabled = true;
            scanButton.innerHTML = '<span class="scanning-animation">🖨️</span> Scanning...';
            
            try {
                const formData = new FormData();
                formData.append('scanner_id', document.getElementById('scannerSelect').value || 1);
                formData.append('dpi', document.getElementById('dpiSelect').value);
                formData.append('color_mode', document.getElementById('colorModeSelect').value);
                formData.append('auto_deskew', document.getElementById('autoDeskewCheck').checked);
                formData.append('multi_page', document.getElementById('multiPageCheck').checked);
                formData.append('csrfmiddlewaretoken', getCookie('csrftoken'));

                const response = await fetch(SCAN_URL, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const errorText = await response.text();
                    throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
                }

                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Scan failed with unknown error');
                }
                
                // Success case
                addScannedDocument(result.image, result.file_name);
                showMessage('Scan completed successfully', 'success');
                
            } catch (error) {
                console.error('Scan error:', error);
                showMessage(error.message, 'error', 10000);
            } finally {
                scanButton.disabled = false;
                scanButton.innerHTML = '<span>🖨️</span> Scan Document';
            }
        }

        // Helper function to get CSRF token
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        // Scan document functionality
        document.getElementById('scanButton').addEventListener('click', async function() {
            const scanButton = document.getElementById('scanButton');
            scanButton.disabled = true;
            scanButton.innerHTML = '<span class="scanning-animation">🖨️</span> Scanning...';
            
            try {
                const response = await fetch(SCAN_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin'
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Add the scanned document to the list
                    addScannedDocument(result.image, 'scanned_document.pdf');
                    showMessage('Scan completed successfully', 'success');
                } else {
                    throw new Error(result.error || 'Scanning failed');
                }
            } catch (error) {
                console.error('Scan error:', error);
                showMessage('Scan failed: ' + error.message, 'error');
            } finally {
                scanButton.disabled = false;
                scanButton.innerHTML = '<span>🖨️</span> Scan Document Instead';
            }
        });

        // Scanned documents management
        let scannedDocuments = [];
        let currentDocumentIndex = -1;

        function addScannedDocument(imageData, fileName) {
            const documentId = Date.now();
            scannedDocuments.push({
                id: documentId,
                image: imageData,
                name: fileName,
                size: 'Scanned document'
            });
            
            renderScannedDocuments();
            
            // Auto-select the newly added document
            selectScannedDocument(scannedDocuments.length - 1);
        }

        function renderScannedDocuments() {
            const container = document.getElementById('scannedDocumentsList');
            container.innerHTML = '';
            
            if (scannedDocuments.length === 0) {
                document.getElementById('scannedDocumentsContainer').style.display = 'none';
                return;
            }
            
            document.getElementById('scannedDocumentsContainer').style.display = 'block';
            
            scannedDocuments.forEach((doc, index) => {
                const docElement = document.createElement('div');
                docElement.className = `scanned-document ${currentDocumentIndex === index ? 'selected' : ''}`;
                docElement.innerHTML = `
                    <div class="scanned-document-info">
                        <img src="${doc.image}" class="scanned-document-preview">
                        <div>
                            <div class="scanned-document-name">${doc.name}</div>
                            <div class="scanned-document-size">${doc.size}</div>
                        </div>
                    </div>
                    <div class="scanned-document-actions">
                        <button class="scanned-document-btn edit" data-id="${doc.id}">✏️</button>
                        <button class="scanned-document-btn delete" data-id="${doc.id}">🗑️</button>
                    </div>
                `;
                
                docElement.addEventListener('click', () => selectScannedDocument(index));
                container.appendChild(docElement);
                
                // Add event listeners for edit and delete buttons
                docElement.querySelector('.edit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showRenameModal(index);
                });
                
                docElement.querySelector('.delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteScannedDocument(index);
                });
            });
        }

        function selectScannedDocument(index) {
            currentDocumentIndex = index;
            const doc = scannedDocuments[index];
            function getBase64WithoutPrefix(dataUrl) {
                // Remove the prefix like "data:application/pdf;base64,"
                return dataUrl.substring(dataUrl.indexOf(',') + 1);
            }
            // Update the form fields
            document.getElementById('scanData').value = getBase64WithoutPrefix(doc.image);
            document.getElementById('scanFileName').value = doc.name;
            
            // Update the file preview
            document.getElementById('fileName').textContent = doc.name;
            document.getElementById('fileSize').textContent = doc.size;
            document.getElementById('filePreview').style.display = 'block';
            document.querySelector('.file-input-text').textContent = doc.name;
            
            // Highlight the selected document
            document.querySelectorAll('.scanned-document').forEach((el, i) => {
                if (i === index) {
                    el.classList.add('selected');
                    el.style.border = '1px solid #3b82f6';
                } else {
                    el.classList.remove('selected');
                    el.style.border = '1px solid #e2e8f0';
                }
            });
        }

        function deleteScannedDocument(index) {
            scannedDocuments.splice(index, 1);
            
            if (scannedDocuments.length === 0) {
                // No documents left, clear the form
                document.getElementById('scanData').value = '';
                document.getElementById('scanFileName').value = '';
                document.getElementById('filePreview').style.display = 'none';
                document.querySelector('.file-input-text').textContent = 'No file chosen';
                currentDocumentIndex = -1;
            } else if (currentDocumentIndex === index) {
                // Deleted the currently selected document, select the previous one
                selectScannedDocument(Math.max(0, index - 1));
            } else if (currentDocumentIndex > index) {
                // Adjust the current index if needed
                currentDocumentIndex--;
            }
            
            renderScannedDocuments();
        }

        function showRenameModal(index) {
            currentDocumentIndex = index;
            const doc = scannedDocuments[index];
            const modal = document.getElementById('renameModal');
            const input = document.getElementById('renameInput');
            
            // Remove file extension if present
            const fileNameWithoutExt = doc.name.replace(/\.[^/.]+$/, "");
            input.value = fileNameWithoutExt;
            
            modal.style.display = 'flex';
            input.focus();
        }

        // Rename modal functionality
        document.getElementById('cancelRename').addEventListener('click', () => {
            document.getElementById('renameModal').style.display = 'none';
        });

        document.getElementById('confirmRename').addEventListener('click', () => {
            const newName = document.getElementById('renameInput').value.trim();
            if (newName) {
                const doc = scannedDocuments[currentDocumentIndex];
                
                // Preserve the file extension
                const fileExt = doc.name.split('.').pop();
                const newFileName = newName + '.' + fileExt;
                
                // Update the document
                scannedDocuments[currentDocumentIndex].name = newFileName;
                
                // Update the form fields
                document.getElementById('scanFileName').value = newFileName;
                document.getElementById('fileName').textContent = newFileName;
                
                // Re-render the list
                renderScannedDocuments();
                
                // Close the modal
                document.getElementById('renameModal').style.display = 'none';
            }
        });

        // Close modal when clicking outside
        document.getElementById('renameModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('renameModal')) {
                document.getElementById('renameModal').style.display = 'none';
            }
        });

        // Form submission
        document.getElementById('uploadForm').addEventListener('submit', function(e) {
            // Basic validation
            const requiredFields = ['category', 'year', 'month', 'date'];
            let isValid = true;
            
            requiredFields.forEach(field => {
                const element = document.getElementById(field);
                if (!element.value) {
                    isValid = false;
                    element.style.borderColor = '#ef4444';
                } else {
                    element.style.borderColor = '#d1d5db';
                }
            });
            
            if (!fileInput.files.length && !document.getElementById('scanData').value) {
                isValid = false;
                showMessage('Please select a file or scan a document', 'error');
                e.preventDefault();
                return;
            }
            
            if (!isValid) {
                showMessage('Please fill in all required fields', 'error');
                e.preventDefault();
            }
        });

        // Helper function to get CSRF token
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }

        function showMessage(text, type) {
            const message = document.getElementById('message');
            message.textContent = text;
            message.className = `message ${type}`;
            message.style.display = 'block';
            
            setTimeout(() => {
                message.style.display = 'none';
            }, 5000);
        }

        // Date input sync
        function syncDateInputs() {
            const date = new Date(document.getElementById('dateInput').value);
            if (date) {
                document.getElementById('year').value = date.getFullYear();
                document.getElementById('month').value = (date.getMonth() + 1).toString().padStart(2, '0');
                populateDates();
                setTimeout(() => {
                    document.getElementById('date').value = date.getDate().toString().padStart(2, '0');
                }, 100);
            }
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
            initializeDatePickers();
            
            // Hide scanned documents container initially
            document.getElementById('scannedDocumentsContainer').style.display = 'none';
        });

// Store scanned pages as base64 PDF strings
let scannedPages = [];

// When "Scan Document Instead" button is clicked - start a new scan and reset pages
document.getElementById('scanButton').addEventListener('click', async () => {
    scannedPages = [];  // reset pages on new scan session
    await performScanAndAddPage();
});

// When "Add Page to Document" button is clicked - add another scanned page
document.getElementById('addPageButton').addEventListener('click', async () => {
    await performScanAndAddPage();
});

// When "Preview Document" button is clicked - combine pages and open preview
document.getElementById('previewButton').addEventListener('click', () => {
    if (scannedPages.length === 0) {
        alert('No scanned pages available to preview.');
        return;
    }

    // Combine scanned PDFs into one Blob (assuming each page is a base64 PDF)
    // For simplicity, just show the first page here, or you can enhance with pdf-lib
    // For now, open first page in new tab
    const pdfData = scannedPages[0];
    window.open(pdfData, '_blank');
});

async function performScanAndAddPage() {
    try {
        // Call your scan API as usual (adjust fetch to your setup)
        const formData = new FormData();
        formData.append('scanner_id', document.getElementById('scannerSelect').value);
        formData.append('dpi', document.getElementById('dpiSelect').value);
        formData.append('color_mode', document.getElementById('colorModeSelect').value);
        formData.append('auto_deskew', document.getElementById('autoDeskewCheck').checked);

        const response = await fetch(SCAN_URL, {
            method: 'POST',
            body: formData,
            headers: {
              'X-CSRFToken': getCookie('csrftoken'),
            },
        });

        const data = await response.json();

        if (!data.success) {
            alert('Scan failed: ' + data.error);
            return;
        }

        // data.image is base64 PDF URI like "data:application/pdf;base64,..."
        scannedPages.push(data.image);

        // Update hidden inputs to send combined scanned document on form submit
        // For now, just store latest scan (single page)
        document.getElementById('scanData').value = data.image;
        document.getElementById('scanFileName').value = data.file_name;

        // Show scanned pages list UI update
        addScannedPageToList(data.file_name);

    } catch (error) {
        alert('Error during scanning: ' + error);
    }
}

function addScannedPageToList(fileName) {
    const container = document.getElementById('scannedDocumentsList');
    const pageCount = scannedPages.length;
    
    const div = document.createElement('div');
    div.className = 'scanned-document-item';
    div.textContent = `Page ${pageCount}: ${fileName}`;
    
    container.appendChild(div);
}

// Helper to get CSRF token cookie (add this if not in your JS)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
