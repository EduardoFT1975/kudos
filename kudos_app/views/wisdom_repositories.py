# kudos_app/views/wisdom_repositories.py

from kudos_app.models import User, Capsule
from django.db.models import Q
import streamlit as st

def wisdom_repositories(request):
    if hasattr(st, '_is_running_with_streamlit') and st._is_running_with_streamlit:
        st.title("Repositorios de Sabiduría Multidimensional")
        st.write("Explora cápsulas educativas para aprender y compartir conocimiento global.")

        user = request.user if request.user.is_authenticated else User.objects.first()

        capsules = Capsule.objects.filter(modo='educativo', privacy='publico')

        themes = st.multiselect("Temas", ["Historia", "Cultura", "Ciencia", "Arte"], default=["Historia"], key="wisdom_themes")
        if themes:
            theme_conditions = Q()
            for theme in themes:
                theme_conditions |= Q(temas__contains=[theme])
            capsules = capsules.filter(theme_conditions)

        st.header("Cápsulas Educativas")
        if capsules.exists():
            for capsule in capsules:
                capsule_key = f"capsule_wisdom_{capsule.uid}"
                st.markdown(f"""
                <div class="capsule-card">
                    <h3>{capsule.contenido[:50]}...</h3>
                    <p><strong>Autor:</strong> {capsule.usuario.alias}</p>
                    <p><strong>Ubicación:</strong> ({capsule.ubicacion.y}, {capsule.ubicacion.x})</p>
                    <p><strong>Fecha:</strong> {capsule.fecha}</p>
                    <p><strong>Temas:</strong> {', '.join(capsule.temas if isinstance(capsule.temas, list) else [capsule.temas])}</p>
                    <p><strong>Nivel Educativo:</strong> {capsule.parameters.get('educational_level', 'No especificado')}</p>
                    <p><strong>Objetivos de Aprendizaje:</strong> {capsule.parameters.get('learning_objectives', 'No especificado')}</p>
                </div>
                """, unsafe_allow_html=True)
                st.write("---")
        else:
            st.info("No se encontraron cápsulas educativas con los criterios seleccionados.")
    else:
        return render(request, 'wisdom_repositories.html', {'capsules': Capsule.objects.filter(modo='educativo', privacy='publico')})