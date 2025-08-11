from django.db.models.signals import post_save,user_logged_in, user_logged_out
from django.dispatch import receiver
from datetime import datetime, timedelta
from .models import Category, YearFolder, MonthFolder, DateFolder
from django.utils import timezone
from .models import UserSession

@receiver(post_save, sender=Category)
def create_folders_for_new_category(sender, instance, created, **kwargs):
    if not created:
        return

    start_year = 2015
    end_year = 2040

    for year in range(start_year, end_year + 1):
        year_folder, _ = YearFolder.objects.get_or_create(category=instance, year=year)
        for month in range(1, 13):
            month_folder, _ = MonthFolder.objects.get_or_create(year_folder=year_folder, month=month)

            # Get total days in that month
            first_day = datetime(year, month, 1).date()
            next_month = (first_day.replace(day=28) + timedelta(days=4)).replace(day=1)
            num_days = (next_month - timedelta(days=1)).day

            for day in range(1, num_days + 1):
                date_obj = datetime(year, month, day).date()
                DateFolder.objects.get_or_create(month_folder=month_folder, date=date_obj)

@receiver(user_logged_in)
def on_user_logged_in(sender, request, user, **kwargs):
    # Create a new session record on login
    UserSession.objects.create(user=user)

@receiver(user_logged_out)
def on_user_logged_out(sender, request, user, **kwargs):
    if not user.is_authenticated:
        return
    # Find the latest session without logout_time and update it
    session = UserSession.objects.filter(user=user, logout_time__isnull=True).order_by('-login_time').first()
    if session:
        session.logout_time = timezone.now()
        session.save()