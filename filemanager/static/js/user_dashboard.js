// Tab switching functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all tabs and content
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding content
                const tabName = this.getAttribute('data-tab');
                if (tabName === 'dashboard') {
                    document.getElementById('dashboardContent').classList.add('active');
                } else if (tabName === 'browse') {
                    document.getElementById('browseContent').classList.add('active');
                }
            });
        });

        // Department folder click handler
        function openCategoryFolder(categoryId) {
            // Redirect to browser with category filter
            window.location.href = "{% url 'user_browser' %}?category=" + categoryId;
        }

        // Add some interactive animations
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });

        // Search functionality
        document.getElementById('searchForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get all form values
            const formData = new FormData(this);
            const searchParams = new URLSearchParams();
            
            // Add all form fields to search params
            for (const [key, value] of formData.entries()) {
                if (value && value !== 'all') {
                    searchParams.append(key, value);
                }
            }
            
            // Make the search request
            fetch(`/api/search-files/?${searchParams.toString()}`)
                .then(response => response.json())
                .then(data => {
                    const resultsDiv = document.getElementById('searchResults');
                    
                    if (data.files && data.files.length > 0) {
                        // Create and populate the table with results
                        const tableHTML = createResultsTable(data.files);
                        resultsDiv.innerHTML = tableHTML;
                    } else {
                        // Show empty state
                        resultsDiv.innerHTML = `
                            <div class="empty-state" style="text-align: center; padding: 4rem 2rem;">
                                <div class="empty-icon" style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
                                <div class="empty-text" style="color: #64748b; font-size: 1.125rem;">
                                    No files found. Try adjusting your search filters.
                                </div>
                            </div>`;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    // Show error message
                    document.getElementById('searchResults').innerHTML = `
                        <div class="empty-state" style="text-align: center; padding: 4rem 2rem;">
                            <div class="empty-icon" style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                            <div class="empty-text" style="color: #dc2626; font-size: 1.125rem;">
                                An error occurred while searching. Please try again.
                            </div>
                        </div>`;
                });
        });

        // Handle real-time filtering as user types
        let searchTimeout;
        document.getElementById('searchQuery').addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                document.getElementById('searchForm').dispatchEvent(new Event('submit'));
            }, 300); // Wait 300ms after user stops typing
        });

        // Handle filter changes
        document.querySelectorAll('.filter-group select').forEach(select => {
            select.addEventListener('change', function() {
                document.getElementById('searchForm').dispatchEvent(new Event('submit'));
            });
        });

        function createResultsTable(files) {
            return `
            <div class="files-table" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8fafc; text-align: left;">
                            <th style="padding: 1rem; color: #4b5563; font-weight: 600;">Name</th>
                            <th style="padding: 1rem; color: #4b5563; font-weight: 600;">Category</th>
                            <th style="padding: 1rem; color: #4b5563; font-weight: 600;">Size</th>
                            <th style="padding: 1rem; color: #4b5563; font-weight: 600;">Uploaded</th>
                            <th style="padding: 1rem; color: #4b5563; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${files.map(file => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 1rem;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-size: 1.25rem;">
                                            ${getFileIcon(file.file_type)}
                                        </span>
                                        <span style="font-weight: 500; color: #1e293b;">${file.name}</span>
                                    </div>
                                </td>
                                <td style="padding: 1rem; color: #64748b;">${file.category}</td>
                                <td style="padding: 1rem; color: #64748b;">${formatFileSize(file.size)}</td>
                                <td style="padding: 1rem; color: #64748b;">${formatDate(file.uploaded_at)}</td>
                                <td style="padding: 1rem;">
                                    <div style="display: flex; gap: 0.5rem;">
                                        <a href="${file.url}" target="_blank" 
                                           style="padding: 0.5rem; background: #1e3a8a; color: white; 
                                                  border-radius: 6px; text-decoration: none; font-size: 0.875rem;">
                                            View
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        function getFileIcon(fileType) {
            const icons = {
                'PDF': '📄',
                'DOC': '📝',
                'IMG': '🖼️',
                'XLS': '📊',
                'DEFAULT': '📎'
            };
            return icons[fileType] || icons.DEFAULT;
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }