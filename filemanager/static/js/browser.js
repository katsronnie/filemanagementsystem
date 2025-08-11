// Global variables to track current filters and state
    let currentFilters = {
        category: '',
        year: '',
        month: '',
        date: '',
        search: ''
    };
    let currentPage = 1;
    let debounceTimer;

    // Initialize the file browser when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Set up dependent filter controls
        setupDependentFilters();
        
        // Set up event listeners for all filter controls
        setupEventListeners();
        
        // Load initial files
        loadFiles();
    });

    // Set up the dependent behavior of year -> month -> date filters
    function setupDependentFilters() {
        const yearSelect = document.getElementById('year');
        const monthSelect = document.getElementById('month');
        const dateInput = document.getElementById('date');

        // Year selection enables/disables month selector
        yearSelect.addEventListener('change', function() {
            monthSelect.disabled = !this.value;
            if (!this.value) {
                monthSelect.value = '';
                dateInput.disabled = true;
                dateInput.value = '';
            }
        });

        // Month selection enables/disables date selector
        monthSelect.addEventListener('change', function() {
            dateInput.disabled = !this.value;
            if (!this.value) {
                dateInput.value = '';
            }
            
            // Set date input min/max based on selected year/month
            if (yearSelect.value && this.value) {
                const year = yearSelect.value;
                const month = this.value.padStart(2, '0');
                const daysInMonth = new Date(year, month, 0).getDate();
                
                dateInput.min = `${year}-${month}-01`;
                dateInput.max = `${year}-${month}-${daysInMonth.toString().padStart(2, '0')}`;
            }
        });
    }

    // Set up event listeners for all interactive elements
    function setupEventListeners() {
        // Category filter
        document.getElementById('category').addEventListener('change', function() {
            currentFilters.category = this.value;
            currentPage = 1;
            loadFiles();
        });

        // Year filter
        document.getElementById('year').addEventListener('change', function() {
            currentFilters.year = this.value;
            currentFilters.month = ''; // Reset month when year changes
            currentFilters.date = '';   // Reset date when year changes
            currentPage = 1;
            loadFiles();
        });

        // Month filter
        document.getElementById('month').addEventListener('change', function() {
            currentFilters.month = this.value;
            currentFilters.date = ''; // Reset date when month changes
            currentPage = 1;
            loadFiles();
        });

        // Date filter
        document.getElementById('date').addEventListener('change', function() {
            currentFilters.date = this.value;
            currentPage = 1;
            loadFiles();
        });

        // Search input with debounce
        document.getElementById('search').addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentFilters.search = this.value.trim();
                currentPage = 1;
                loadFiles();
            }, 500);
        });

        // Apply filters button (redundant but good for UX)
        document.querySelector('.apply-filters').addEventListener('click', function() {
            currentPage = 1;
            loadFiles();
        });
    }

    // Main function to load files based on current filters
    function loadFiles(page = currentPage) {
        currentPage = page;
        const params = new URLSearchParams();
        
        // Add all active filters to the request
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.year) params.append('year', currentFilters.year);
        if (currentFilters.month) params.append('month', currentFilters.month);
        if (currentFilters.date) {
            // Extract day from date input (format: yyyy-mm-dd)
            const day = currentFilters.date.split('-')[2];
            params.append('date', day);
        }
        if (currentFilters.search) params.append('search', currentFilters.search);
        params.append('page', currentPage);
        
        showLoadingState();
        
        fetch(`{% url 'get_files_by_date' %}?${params.toString()}`)
            .then(handleResponse)
            .then(data => {
                renderFiles(data.files);
                renderPagination(data.pagination);
            })
            .catch(error => {
                showErrorState(error.message);
            });
    }

    // Handle the API response
    function handleResponse(response) {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.error || 'Failed to load files'); 
            });
        }
        return response.json();
    }

    // Render the files in the table
    function renderFiles(files) {
        const tbody = document.querySelector('tbody');
        
        if (files.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        No files found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = files.map(file => `
            <tr>
                <td>
                    <div class="file-info">
                        <div class="file-icon">${getFileIcon(file.mimetype)}</div>
                        <div>
                            <div class="file-name">${file.filename}</div>
                            <div class="file-meta">
                                Uploaded by ${file.uploaded_by}
                            </div>
                        </div>
                    </div>
                </td>
                <td><span class="file-category">${file.category}</span></td>
                <td>${file.year}</td>
                <td>${new Date(2000, file.month - 1).toLocaleString('default', {month: 'long'})}</td>
                <td>${file.day}</td>
                <td class="file-size">${file.formatted_size}</td>
                <td>
                    <div class="actions">
                        <button class="action-btn preview-btn" title="Preview" 
                            onclick="window.open('${file.filepath}', '_blank')">👁️</button>
                        <button class="action-btn download-btn" title="Download"
                            onclick="downloadFile('${file.filepath}', '${file.filename}')">⬇️</button>
                        ${file.can_delete ? `
                        <button class="action-btn delete-btn" title="Delete"
                            onclick="deleteFile(${file.id}, this)">🗑️</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Get appropriate icon for file type
    function getFileIcon(mimetype) {
        if (!mimetype) return '📁';
        mimetype = mimetype.toLowerCase();
        if (mimetype.includes('pdf')) return '📄';
        if (mimetype.includes('image')) return '🖼️';
        if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return '📊';
        if (mimetype.includes('word')) return '📝';
        if (mimetype.includes('video')) return '🎬';
        if (mimetype.includes('audio')) return '🎵';
        return '📁';
    }

    // Render pagination controls
    function renderPagination(pagination) {
        const container = document.querySelector('.pagination');
        if (!pagination || pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        const { current_page, total_pages } = pagination;
        container.innerHTML = '';
        
        // Previous button
        container.appendChild(createPageBtn('❮', current_page > 1, () => loadFiles(current_page - 1)));
        
        // Always show first page
        container.appendChild(createPageBtn(1, current_page === 1, () => loadFiles(1)));
        
        // Show ellipsis if needed
        if (current_page > 3) {
            container.appendChild(createEllipsis());
        }
        
        // Show current page and neighbors
        const start = Math.max(2, current_page - 1);
        const end = Math.min(total_pages - 1, current_page + 1);
        
        for (let i = start; i <= end; i++) {
            container.appendChild(createPageBtn(i, i === current_page, () => loadFiles(i)));
        }
        
        // Show ellipsis if needed
        if (current_page < total_pages - 2) {
            container.appendChild(createEllipsis());
        }
        
        // Always show last page if different from first
        if (total_pages > 1) {
            container.appendChild(createPageBtn(total_pages, current_page === total_pages, () => loadFiles(total_pages)));
        }
        
        // Next button
        container.appendChild(createPageBtn('❯', current_page < total_pages, () => loadFiles(current_page + 1)));
    }

    // Helper to create a pagination button
    function createPageBtn(text, isActive, onClick) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${isActive ? 'active' : ''}`;
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        return btn;
    }

    // Helper to create ellipsis for pagination
    function createEllipsis() {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '...';
        return span;
    }

    // Show loading state
    function showLoadingState() {
        document.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="loading-spinner"></div>
                    <div>Loading files...</div>
                </td>
            </tr>
        `;
    }

    // Show error state
    function showErrorState(message) {
        document.querySelector('tbody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-red-500">
                    ${message || 'Failed to load files'}
                </td>
            </tr>
        `;
        document.querySelector('.pagination').innerHTML = '';
    }

    // Download file function
    function downloadFile(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Delete file function
    function deleteFile(fileId, btn) {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '⌛';
        
        fetch(`{% url 'delete_file' file_id=0 %}`.replace('0', fileId), {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to delete file');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remove the row from the table
                btn.closest('tr').remove();
                // Reload files if this was the last item on the page
                if (document.querySelectorAll('tbody tr').length === 0) {
                    loadFiles(Math.max(1, currentPage - 1));
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
            btn.disabled = false;
            btn.innerHTML = '🗑️';
        });
    }

    // Helper function to get CSRF token
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }