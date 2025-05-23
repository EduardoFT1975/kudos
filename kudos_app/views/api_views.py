# kudos_app/views/api_views.py

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from kudos_app.models import Capsule
from kudos_app.serializers import CapsuleSerializer, UserSerializer
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError

class CapsuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD sobre cápsulas.
    """
    queryset = Capsule.objects.all()
    serializer_class = CapsuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtra cápsulas según el usuario autenticado y parámetros de consulta.
        """
        queryset = self.queryset.filter(privacy="publico")
        user = self.request.user

        # Filtrar por usuario si es el propietario o admin
        if user.is_authenticated:
            if user.is_staff:
                queryset = self.queryset  # Admin ve todas
            else:
                queryset = queryset | Capsule.objects.filter(usuario=user)

        # Filtrar por tema si se especifica
        theme = self.request.query_params.get('theme', None)
        if theme:
            queryset = queryset.filter(temas__contains=[theme])

        # Filtrar por cercanía si hay ubicación
        lat = self.request.query_params.get('lat', None)
        lon = self.request.query_params.get('lon', None)
        if lat and lon and user.notification_distance:
            try:
                point = Point(float(lon), float(lat))
                queryset = queryset.filter(
                    ubicacion__distance_lte=(point, user.notification_distance)
                )
            except ValueError:
                pass

        return queryset.order_by('-timestamp')

    def perform_create(self, serializer):
        """
        Personaliza la creación de cápsulas con datos del usuario autenticado.
        """
        serializer.save(
            usuario=self.request.user,
            fecha=timezone.now().date(),
            ubicacion=self.request.user.ubicacion
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """
        Endpoint para dar o quitar un 'Like' a una cápsula.
        """
        capsule = self.get_object()
        user = request.user
        
        if user in capsule.likes.all():
            capsule.likes.remove(user)
            message = "Like removido."
            is_liked = False
        else:
            capsule.likes.add(user)
            message = "Like agregado."
            is_liked = True
        
        capsule.save()
        return Response({
            'success': True,
            'is_liked': is_liked,
            'likes_count': capsule.likes.count(),
            'message': message
        })

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de usuarios (CRUD).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Limita la visibilidad según permisos del usuario.
        """
        user = self.request.user
        if user.is_staff:
            return self.queryset  # Admin ve todos
        return self.queryset.filter(id=user.id)  # Usuarios ven solo su perfil

    def perform_create(self, serializer):
        """
        Personaliza la creación de usuarios con contraseña.
        """
        user = serializer.save()
        user.set_password(serializer.validated_data['password'])
        user.save()

    def perform_update(self, serializer):
        """
        Personaliza la actualización de usuarios, manejando la contraseña.
        """
        user = serializer.save()
        if 'password' in serializer.validated_data:
            user.set_password(serializer.validated_data['password'])
            user.save()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Endpoint para obtener el perfil del usuario autenticado.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, pk=None):
        """
        Endpoint para seguir o dejar de seguir a un usuario.
        """
        target_user = self.get_object()
        current_user = request.user
        
        if current_user == target_user:
            return Response({'success': False, 'message': 'No puedes seguirte a ti mismo'}, status=status.HTTP_400_BAD_REQUEST)
        
        if current_user in target_user.followers.all():
            target_user.followers.remove(current_user)
            message = "Dejaste de seguir al usuario."
        else:
            target_user.followers.add(current_user)
            message = "Usuario seguido exitosamente."
        
        target_user.save()
        return Response({'success': True, 'message': message})