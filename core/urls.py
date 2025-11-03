from django.urls import path
from .views import register_user, login_user, get_current_user, get_or_update_property, update_user, create_claim, get_recent_claim, list_claims, review_claim

urlpatterns = [
  path('register/', register_user, name='register_user'),
  path('login/', login_user, name='login_user'),
  path('user/', get_current_user, name='get_current_user'),
  path('property/', get_or_update_property, name='get_or_update_property'),
  path('update-user/', update_user, name='update_user'),
  path('claims/new/', create_claim, name='create_claim'),
  path('recent-claim/', get_recent_claim, name='get_recent_claim'),
  path('claims/', list_claims, name='list_claims'),
  path('me/', get_current_user, name='get_current_user'),
  path('claims/<int:claim_id>/review/', review_claim, name='review_claim'),

]


