// Simple JavaScript to handle back button and any dynamic interactions
        document.addEventListener('DOMContentLoaded', function() {
            // You can add any dynamic JavaScript functionality here if needed
            // For example, if you want to keep some of the client-side navigation
            // you can adapt it to work with the Django URLs
            
            // Example: Highlight current selection
            const currentPath = window.location.pathname;
            document.querySelectorAll('.folder-item').forEach(item => {
                if (item.href === currentPath) {
                    item.style.borderColor = '#1e3a8a';
                    item.style.boxShadow = '0 4px 12px rgba(30, 58, 138, 0.2)';
                }
            });
        });