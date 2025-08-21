// Tab switching functionality
        function switchTab(tabName) {
            const tabs = document.querySelectorAll('.nav-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            console.log(`Switched to ${tabName} tab`);
        }

        // Modal functionality
        function openAddCategoryModal() {
            document.getElementById('addCategoryModal').style.display = 'block';
        }

        function closeAddCategoryModal() {
            document.getElementById('addCategoryModal').style.display = 'none';
            document.getElementById('addCategoryForm').reset();
        }

        function openEditCategoryModal() {
            document.getElementById('editCategoryModal').style.display = 'block';
        }

        function closeEditCategoryModal() {
            document.getElementById('editCategoryModal').style.display = 'none';
        }

        function openDeleteCategoryModal() {
            document.getElementById('deleteCategoryModal').style.display = 'block';
        }

        function closeDeleteCategoryModal() {
            document.getElementById('deleteCategoryModal').style.display = 'none';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const addModal = document.getElementById('addCategoryModal');
            const editModal = document.getElementById('editCategoryModal');
            const deleteModal = document.getElementById('deleteCategoryModal');
            
            if (event.target === addModal) {
                closeAddCategoryModal();
            }
            
            if (event.target === editModal) {
                closeEditCategoryModal();
            }
            
            if (event.target === deleteModal) {
                closeDeleteCategoryModal();
            }
        }

        // Edit category functionality
        function editCategory(categoryId) {
            fetch(`/categories/${categoryId}/json/`)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('editCategoryId').value = data.id;
                    document.getElementById('editCategoryName').value = data.name;
                    document.getElementById('editCategoryDescription').value = data.description;
                    document.getElementById('editCategoryDepartment').value = data.department;
                    document.getElementById('editCategoryIsActive').value = data.is_active.toString();
                    document.getElementById('editCategoryForm').action = `/categories/${data.id}/`;
                    openEditCategoryModal();
                })
                .catch(error => {
                    console.error('Error fetching category data:', error);
                    alert('Error loading category data');
                });
        }

        // Delete category confirmation
        function confirmDeleteCategory(id, name) {
            document.getElementById('deleteCategoryId').value = id;
            document.getElementById('categoryToDeleteName').textContent = name;
            document.getElementById('deleteCategoryForm').action = `/categories/${id}/`;
            openDeleteCategoryModal();
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // ESC to close modals
            if (e.key === 'Escape') {
                closeAddCategoryModal();
                closeEditCategoryModal();
                closeDeleteCategoryModal();
            }
            
            // Ctrl+N to add new category
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                openAddCategoryModal();
            }
        });