document.getElementById('addUserForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Adding User...';

    try {
        const formData = {
            username: document.getElementById('userUsername').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            password: document.getElementById('userPassword').value,
            department: document.getElementById('userDepartment').value,
            is_staff: document.getElementById('userIsStaff').checked,
            is_approved: document.getElementById('userIsApproved').checked
        };

        // Basic validation
        if (!formData.username || !formData.email || !formData.password || !formData.department) {
            throw new Error('Please fill in all required fields');
        }

        const response = await fetch("{% url 'add_user_api' %}", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie('csrftoken'),
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to add user');
        }

        // Success - show message and reset form
        alert(`User ${data.user.username} created successfully!`);
        closeAddUserModal();
        window.location.reload();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>+</span> Add User';
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
        // Tab switching functionality
        function switchTab(tabName) {
            const tabs = document.querySelectorAll('.nav-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // Here you would typically load different content based on the tab
            console.log(`Switched to ${tabName} tab`);
        }

        // Modal functionality
        function openAddUserModal() {
            document.getElementById('addUserModal').style.display = 'block';
        }

        function closeAddUserModal() {
            document.getElementById('addUserModal').style.display = 'none';
            document.getElementById('addUserForm').reset();
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('addUserModal');
            if (event.target === modal) {
                closeAddUserModal();
            }
        }

        // Add user functionality
        document.getElementById('addUserForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('userEmail').value;
            const role = document.getElementById('userRole').value;
            
            // Create new user row
            const tbody = document.getElementById('usersTableBody');
            const newRow = document.createElement('tr');
            const currentDate = new Date().toLocaleDateString('en-GB');
            
            newRow.innerHTML = `
                <td>${email}</td>
                <td>${currentDate}</td>
                <td>Never</td>
                <td><span class="status-badge">Pending</span></td>
                <td>
                    <div class="actions">
                        <button class="action-btn edit-btn" onclick="editUser('${email}')">✏️</button>
                        <button class="action-btn delete-btn" onclick="deleteUser('${email}')">🗑️</button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(newRow);
            closeAddUserModal();
            
            // Show success message
            alert(`User ${email} has been added successfully!`);
        });

        // Edit user functionality
        function editUser(email) {
            alert(`Edit functionality for ${email} would open here`);
        }

        // Delete user functionality
        function deleteUser(email) {
            if (confirm(`Are you sure you want to delete user ${email}?`)) {
                // Find and remove the row
                const rows = document.querySelectorAll('#usersTableBody tr');
                rows.forEach(row => {
                    if (row.cells[0].textContent === email) {
                        row.remove();
                    }
                });
                alert(`User ${email} has been deleted.`);
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // ESC to close modal
            if (e.key === 'Escape') {
                closeAddUserModal();
            }
            
            // Ctrl+N to add new user
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                openAddUserModal();
            }
        });

        // Auto-refresh last sign in times (simulation)
        setInterval(() => {
            const now = new Date();
            console.log(`Dashboard refreshed at ${now.toLocaleTimeString()}`);
        }, 30000); // Every 30 seconds