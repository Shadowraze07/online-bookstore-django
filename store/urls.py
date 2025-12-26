from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'books', views.BookViewSet)
router.register(r'categories', views.CategoryViewSet)
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'orders', views.OrderViewSet, basename='orders')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/login/', views.login_view, name='api_login'),
    path('api/register/', views.register_user, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('api/profile/', views.UserProfileView.as_view(), name='profile'),
    path('api/favorites/', views.FavoriteListView.as_view(), name='favorites'),
    path('api/favorites/ids/', views.get_favorite_ids, name='favorites-ids'),
    path('api/favorites/toggle/', views.toggle_favorite, name='favorites-toggle'),
    path('api/reviews/', views.ReviewCreateView.as_view(), name='review-create'),
    path('api/reviews/<int:pk>/', views.ReviewDeleteView.as_view(), name='review-delete'),
    path('', views.index, name='index'),
]