// Function to update dashboard stats
function updateDashboardStats() {
    fetch('/api/dashboard-stats/')
        .then(response => response.json())
        .then(data => {
            // Update stats that everyone can see
            document.querySelector('.stat-number:nth-of-type(1)').textContent = data.total_files;
            document.querySelector('.stat-number:nth-of-type(2)').textContent = data.category_count;
            document.querySelector('.stat-number:nth-of-type(3)').textContent = data.storage_used;
            
            // Only update admin stats if the element exists
            const adminStat = document.querySelector('.stat-number:nth-of-type(4)');
            if (adminStat && data.today_users !== undefined) {
                adminStat.textContent = data.today_users;
            }
            
            
            // Update category grid
            const categoryGrid = document.querySelector('.category-grid');
            categoryGrid.innerHTML = '';
            
            if (data.category_stats.length > 0) {
                data.category_stats.forEach(category => {
                    const categoryItem = document.createElement('div');
                    categoryItem.className = 'category-item';
                    categoryItem.innerHTML = `
                        <div class="category-info">
                            <div class="category-name">${category.name}</div>
                            <div class="category-desc">${category.description}</div>
                        </div>
                        <div class="category-count">${category.file_count} files</div>
                    `;
                    categoryGrid.appendChild(categoryItem);
                });
            } else {
                categoryGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📁</div>
                        <div class="empty-text">No categories available</div>
                    </div>
                `;
            }
            
            // Update recent uploads
            const recentUploadsSection = document.querySelector('.section-card:last-child');
            if (data.recent_uploads.length > 0) {
                let tableHTML = `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 0.75rem; text-align: left;">File Name</th>
                                    <th style="padding: 0.75rem; text-align: left;">Category</th>
                                    <th style="padding: 0.75rem; text-align: left;">Uploaded By</th>
                                    <th style="padding: 0.75rem; text-align: left;">Date</th>
                                    <th style="padding: 0.75rem; text-align: left;">Size</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                data.recent_uploads.forEach(file => {
                    tableHTML += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 0.75rem;">${file.name}</td>
                            <td style="padding: 0.75rem;">${file.category}</td>
                            <td style="padding: 0.75rem;">${file.uploaded_by}</td>
                            <td style="padding: 0.75rem;">${file.uploaded_at}</td>
                            <td style="padding: 0.75rem;">${file.size}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
                
                recentUploadsSection.innerHTML = `
                    <h2 class="section-title">Recent File Uploads</h2>
                    ${tableHTML}
                `;
            } else {
                recentUploadsSection.innerHTML = `
                    <h2 class="section-title">Recent File Uploads</h2>
                    <div class="empty-state">
                        <div class="empty-icon">🕐</div>
                        <div class="empty-text">No recent file uploads</div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard stats:', error);
        });
}

// Update stats every 30 seconds
document.addEventListener('DOMContentLoaded', function() {
    updateDashboardStats();
    setInterval(updateDashboardStats, 30000);
});