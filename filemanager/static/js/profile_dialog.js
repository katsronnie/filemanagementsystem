// Function to toggle the profile dialog
function toggleProfileDialog() {
    const dialog = document.getElementById('profileDialog');
    if (dialog.style.display === 'none' || !dialog.style.display) {
        dialog.style.display = 'block';
        // Close dialog when clicking outside
        document.addEventListener('click', closeDialogOnClickOutside);
    } else {
        dialog.style.display = 'none';
        document.removeEventListener('click', closeDialogOnClickOutside);
    }
}

// Function to close dialog when clicking outside
function closeDialogOnClickOutside(event) {
    const dialog = document.getElementById('profileDialog');
    const avatar = document.querySelector('.user-avatar');
    
    if (!dialog.contains(event.target) && !avatar.contains(event.target)) {
        dialog.style.display = 'none';
        document.removeEventListener('click', closeDialogOnClickOutside);
    }
}

// Handle logout with confirmation
function handleLogout(event) {
    event.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
        window.location.href = event.target.closest('a').href;
    }
}
