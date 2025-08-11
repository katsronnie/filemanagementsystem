document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    alert(`Logging in with Email: ${email} and Password: ${password}`);
});

document.querySelectorAll('.account-btn').forEach(button => {
    button.addEventListener('click', function() {
        const email = this.getAttribute('data-email');
        document.getElementById('email').value = email;
        document.getElementById('password').value = '******';
    });
});