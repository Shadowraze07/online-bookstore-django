from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import logout, authenticate, login
from django.contrib.auth.models import User
from django.db.models import Avg

from rest_framework import viewsets, permissions, status, generics, filters
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from .models import Book, Category, Cart, CartItem, Order, OrderItem, Review, Favorite
from .serializers import (
    BookSerializer, CategorySerializer, CartSerializer, 
    OrderSerializer, UserSerializer, ReviewSerializer
)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None
    permission_classes = [AllowAny]

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.annotate(average_rating=Avg('reviews__rating')).all()
    serializer_class = BookSerializer
    permission_classes = [AllowAny]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['title', 'author']
    ordering_fields = ['price', 'created_at', 'average_rating'] 
    filterset_fields = ['category']

class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_cart(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        return cart

    def list(self, request):
        cart = self.get_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add(self, request):
        book_id = request.data.get('book_id')
        if not book_id: return Response({'error': 'no id'}, status=400)
        book = get_object_or_404(Book, id=book_id)
        
        cart = self.get_cart(request)
        item, created = CartItem.objects.get_or_create(cart=cart, book=book)
        if not created:
            item.quantity += 1
            item.save()
        return Response({'status': 'added', 'quantity': item.quantity})

    @action(detail=False, methods=['post'])
    def reduce_quantity(self, request):
        book_id = request.data.get('book_id')
        cart = self.get_cart(request)
        try:
            item = CartItem.objects.get(cart=cart, book_id=book_id)
            if item.quantity > 1:
                item.quantity -= 1
                item.save()
            else:
                item.delete()
        except CartItem.DoesNotExist: 
            return Response({'error': 'not in cart'}, status=404)
        return Response({'status': 'reduced'})

    @action(detail=False, methods=['post'])
    def delete_item(self, request):
        book_id = request.data.get('book_id')
        cart = self.get_cart(request)
        try:
            item = CartItem.objects.get(cart=cart, book_id=book_id)
            item.delete()
        except CartItem.DoesNotExist: 
            return Response({'error': 'not in cart'}, status=404)
        return Response({'status': 'deleted'})

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    pagination_class = None

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        if not cart.items.exists():
            return Response({"error": "Empty cart"}, status=400)
        
        order = Order.objects.create(user=request.user, status='new', total_price=cart.total_price)
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order, book=item.book, quantity=item.quantity, price=item.book.price
            )
            if item.book.stock >= item.quantity:
                item.book.stock -= item.quantity
                item.book.save()

        cart.items.all().delete()
        return Response(self.get_serializer(order).data, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({'status': 'success', 'username': user.username})
    else:
        return Response({'error': 'Неверный логин или пароль'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Заполните все поля'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Такой пользователь уже существует'}, status=400)

    user = User.objects.create_user(username=username, password=password)
    return Response({'status': 'success', 'id': user.id}, status=201)

def logout_view(request):
    logout(request)
    return redirect('/')

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

class FavoriteListView(generics.ListAPIView):
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Book.objects.filter(favorite__user=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorite_ids(request):
    user = request.user
    ids = Favorite.objects.filter(user=user).values_list('book_id', flat=True)
    return Response(list(ids))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite(request):
    book_id = request.data.get('book_id')
    book = get_object_or_404(Book, id=book_id)
    fav_item, created = Favorite.objects.get_or_create(user=request.user, book=book)
    
    if not created:
        fav_item.delete()
        return Response({'is_favorite': False})
    
    return Response({'is_favorite': True})

class ReviewCreateView(generics.CreateAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ReviewDeleteView(generics.DestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Review.objects.all()
        return Review.objects.filter(user=self.request.user)

def index(request):
    return render(request, 'store/index.html')