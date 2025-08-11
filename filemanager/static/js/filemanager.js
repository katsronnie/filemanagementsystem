// File Manager JavaScript

// Global variables
let csrfToken = '';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get CSRF token
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    if (csrfInput) {
        csrfToken = csrfInput.value;
    }
    
    // Initialize components
    initializeFileManager();
    initializeUploader();
    initializeSearch();
    initializeModals();
    
    // Add fade-in animation to cards
    document.querySelectorAll('.card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
});

// File Manager Core Functions
function initializeFileManager() {
    // File selection handling
    const fileCheckboxes = document.querySelectorAll('.file-checkbox');
    const selectAllCheckbox = document.getElementById('select-all');
    const bulkActionsDiv = document.getElementById('bulk-actions');
    
    if (fileCheckboxes.length > 0) {
        fileCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateBulkActions);
        });
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            fileCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateBulkActions();
        });
    }
    
    function updateBulkActions() {
        const selectedFiles = document.querySelectorAll('.file-checkbox:checked');
        const selectedCount = document.getElementById('selected-count');
        
        if (selectedFiles.length > 0) {
            if (bulkActionsDiv) {
                bulkActionsDiv.style.display = 'block';
                bulkActionsDiv.classList.add('slide-in');
            }
            if (selectedCount) {
                selectedCount.textContent = selectedFiles.length;
            }
        } else {
            if (bulkActionsDiv) {
                bulkActionsDiv.style.display = 'none';
            }
        }
        
        // Update select all checkbox state
        if (selectAllCheckbox) {
            if (selectedFiles.length === 0) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = false;
            } else if (selectedFiles.length === fileCheckboxes.length) {
                selectAllCheckbox.indeterminate = false;
                selectAllCheckbox.checked = true;
            } else {
                selectAllCheckbox.indeterminate = true;
            }
        }
    }
}

// File Upload Functions
function initializeUploader() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    if (!uploadArea || !fileInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        uploadArea.classList.add('dragover');
    }
    
    function unhighlight(e) {
        uploadArea.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (window.fileUploader && typeof window.fileUploader.handleFiles === 'function') {
            window.fileUploader.handleFiles(files);
        } else {
            // Fallback: set files to input
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change'));
        }
    }
}

// Search and Filter Functions
function initializeSearch() {
    const searchForm = document.querySelector('form[method="get"]');
    const searchInput = document.getElementById('search');
    
    if (searchInput) {
        // Auto-submit search after typing stops
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (this.value.length >= 3 || this.value.length === 0) {
                    if (searchForm) {
                        searchForm.submit();
                    }
                }
            }, 1000);
        });
    }
    
    // Filter dropdowns auto-submit
    const filterSelects = document.querySelectorAll('#category, #type, #sort');
    filterSelects.forEach(select => {
        select.addEventListener('change', function() {
            if (searchForm) {
                searchForm.submit();
            }
        });
    });
}

// Modal Functions
function initializeModals() {
    // Initialize Bootstrap modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('shown.bs.modal', function() {
            const firstInput = modal.querySelector('input[type="text"], input[type="email"], textarea');
            if (firstInput) {
                firstInput.focus();
            }
        });
    });
}

// File Operations
async function previewFile(fileId) {
    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    const content = document.getElementById('preview-content');
    const modalTitle = document.querySelector('#previewModal .modal-title');
    
    if (!modal || !content) return;
    
    // Show loading
    content.innerHTML = `
        <div class="d-flex justify-content-center py-5">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    modal.show();
    
    try {
        const response = await fetch(`/files/${fileId}/preview/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            modalTitle.textContent = `Preview: ${data.name}`;
            
            if (data.type.startsWith('image/')) {
                content.innerHTML = `
                    <img src="${data.url}" class="img-fluid rounded" alt="Preview" 
                         style="max-width: 100%; max-height: 70vh;">
                `;
            } else if (data.type === 'application/pdf') {
                content.innerHTML = `
                    <iframe src="${data.url}" width="100%" height="500px" 
                            class="border-0 rounded"></iframe>
                `;
            } else if (data.type.startsWith('text/')) {
                // For text files, fetch content
                const textResponse = await fetch(data.url);
                const textContent = await textResponse.text();
                content.innerHTML = `
                    <pre class="bg-light p-3 rounded" style="max-height: 400px; overflow-y: auto;">
                        <code>${escapeHtml(textContent)}</code>
                    </pre>
                `;
            } else {
                content.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-file fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Preview not available for this file type</p>
                        <a href="${data.url}" class="btn btn-primary" target="_blank">
                            <i class="fas fa-external-link-alt me-2"></i>Open in New Tab
                        </a>
                    </div>
                `;
            }
        } else {
            content.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.error || 'Failed to load preview'}
                </div>
            `;
        }
    } catch (error) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading preview: ${error.message}
            </div>
        `;
    }
}

async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/files/${fileId}/delete/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('File deleted successfully', 'success');
            
            // Remove file from DOM or reload page
            const fileCard = document.querySelector(`[data-file-id="${fileId}"]`);
            if (fileCard) {
                fileCard.style.transition = 'all 0.3s ease';
                fileCard.style.transform = 'scale(0)';
                fileCard.style.opacity = '0';
                setTimeout(() => {
                    fileCard.remove();
                }, 300);
            } else {
                setTimeout(() => location.reload(), 1000);
            }
        } else {
            showNotification(`Error deleting file: ${data.error}`, 'danger');
        }
    } catch (error) {
        showNotification(`Error deleting file: ${error.message}`, 'danger');
    }
}

// Bulk Operations
async function bulkDelete() {
    const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:checked'))
                               .map(cb => cb.value);
    
    if (selectedFiles.length === 0) {
        showNotification('No files selected', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} files? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch('/files/bulk/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'delete',
                file_ids: selectedFiles
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message || 'Files deleted successfully', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'danger');
    }
}

async function bulkMove() {
    const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:checked'))
                               .map(cb => cb.value);
    
    if (selectedFiles.length === 0) {
        showNotification('No files selected', 'warning');
        return;
    }
    
    // Show folder selection modal (simplified version)
    const folderId = prompt('Enter folder ID to move files to (or leave empty for root):');
    
    try {
        const response = await fetch('/files/bulk/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                action: 'move',
                file_ids: selectedFiles,
                folder_id: folderId || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message || 'Files moved successfully', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification(`Error: ${data.error}`, 'danger');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'danger');
    }
}

function bulkShare() {
    const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:checked'))
                               .map(cb => cb.value);
    
    if (selectedFiles.length === 0) {
        showNotification('No files selected', 'warning');
        return;
    }
    
    // Placeholder for bulk share functionality
    showNotification('Bulk share functionality coming soon!', 'info');
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    `;
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileName, fileType) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (fileType.startsWith('image/')) {
        return 'fas fa-file-image';
    } else if (fileType.startsWith('video/')) {
        return 'fas fa-file-video';
    } else if (fileType.startsWith('audio/')) {
        return 'fas fa-file-audio';
    } else if (fileType === 'application/pdf') {
        return 'fas fa-file-pdf';
    } else if (['doc', 'docx'].includes(extension)) {
        return 'fas fa-file-word';
    } else if (['xls', 'xlsx'].includes(extension)) {
        return 'fas fa-file-excel';
    } else if (['ppt', 'pptx'].includes(extension)) {
        return 'fas fa-file-powerpoint';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return 'fas fa-file-archive';
    } else if (['js', 'html', 'css', 'php', 'py', 'java', 'cpp', 'c'].includes(extension)) {
        return 'fas fa-file-code';
    } else if (fileType.startsWith('text/')) {
        return 'fas fa-file-alt';
    } else {
        return 'fas fa-file';
    }
}

// View Toggle Functions
function toggleView(viewType) {
    const gridView = document.getElementById('grid-view-content');
    const listView = document.getElementById('list-view-content');
    
    if (viewType === 'grid') {
        if (gridView) gridView.style.display = 'block';
        if (listView) listView.style.display = 'none';
        localStorage.setItem('fileManagerView', 'grid');
    } else {
        if (gridView) gridView.style.display = 'none';
        if (listView) listView.style.display = 'block';
        localStorage.setItem('fileManagerView', 'list');
    }
}

// Restore saved view preference
document.addEventListener('DOMContentLoaded', function() {
    const savedView = localStorage.getItem('fileManagerView');
    if (savedView) {
        const viewRadio = document.getElementById(savedView + '-view');
        if (viewRadio) {
            viewRadio.checked = true;
            toggleView(savedView);
        }
    }
});

// Search Enhancement
function performAdvancedSearch() {
    const searchParams = {
        query: document.getElementById('search')?.value || '',
        category: document.getElementById('category')?.value || '',
        type: document.getElementById('type')?.value || '',
        folder: document.getElementById('folder')?.value || '',
        tags: document.getElementById('tags')?.value || ''
    };
    
    // Build URL with search parameters
    const url = new URL('/search/', window.location.origin);
    Object.entries(searchParams).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
    });
    
    // Redirect to search results
    window.location.href = url.toString();
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + A - Select all files
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            selectAllCheckbox.click();
        }
    }
    
    // Delete key - Delete selected files
    if (e.key === 'Delete') {
        const selectedFiles = document.querySelectorAll('.file-checkbox:checked');
        if (selectedFiles.length > 0 && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            bulkDelete();
        }
    }
    
    // Escape key - Clear selection
    if (e.key === 'Escape') {
        const checkboxes = document.querySelectorAll('.file-checkbox:checked');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        const event = new Event('change');
        if (checkboxes.length > 0) {
            checkboxes[0].dispatchEvent(event);
        }
    }
});

// Context Menu (Right-click)
document.addEventListener('contextmenu', function(e) {
    const fileCard = e.target.closest('.file-card');
    if (fileCard) {
        e.preventDefault();
        // Show custom context menu (implement as needed)
        showContextMenu(e.pageX, e.pageY, fileCard.dataset.fileId);
    }
});

function showContextMenu(x, y, fileId) {
    // Remove existing context menu
    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.className = 'card shadow-lg position-fixed';
    menu.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        z-index: 9999;
        min-width: 150px;
    `;
    
    menu.innerHTML = `
        <div class="list-group list-group-flush">
            <button class="list-group-item list-group-item-action" onclick="previewFile('${fileId}')">
                <i class="fas fa-eye me-2"></i>Preview
            </button>
            <button class="list-group-item list-group-item-action" onclick="window.open('/files/${fileId}/download/')">
                <i class="fas fa-download me-2"></i>Download
            </button>
            <button class="list-group-item list-group-item-action">
                <i class="fas fa-edit me-2"></i>Rename
            </button>
            <button class="list-group-item list-group-item-action">
                <i class="fas fa-share me-2"></i>Share
            </button>
            <hr class="my-0">
            <button class="list-group-item list-group-item-action text-danger" onclick="deleteFile('${fileId}')">
                <i class="fas fa-trash me-2"></i>Delete
            </button>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    document.addEventListener('click', function removeMenu() {
        menu.remove();
        document.removeEventListener('click', removeMenu);
    });
}

// Export functions for global access
window.fileManager = {
    previewFile,
    deleteFile,
    bulkDelete,
    bulkMove,
    bulkShare,
    showNotification,
    toggleView,
    formatFileSize,
    getFileIcon
};
