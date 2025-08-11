#!/usr/bin/env python
"""
Quick script to create a test user for the file manager.
Run this after setting up the database.
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'file.settings')
django.setup()

from django.contrib.auth.models import User

def create_test_user():
    """Create a test user for demo purposes."""
    username = 'admin'
    email = 'admin@example.com'
    password = 'admin'
    
    if User.objects.filter(username=username).exists():
        print(f"User '{username}' already exists!")
        return
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        is_staff=True,
        is_superuser=True
    )
    
    print(f"Created user: {username}")
    print(f"Password: {password}")
    print("You can now login to the file manager!")

if __name__ == '__main__':
    create_test_user()
