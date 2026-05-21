# kudos_app/utils/education_utils.py

def generate_learning_objectives(educational_level):
    """
    Simula la generación de objetivos de aprendizaje basados en el nivel educativo.
    """
    if educational_level == 'Básico':
        return "Comprender conceptos básicos y desarrollar habilidades iniciales."
    elif educational_level == 'Intermedio':
        return "Profundizar en conceptos intermedios y aplicar conocimientos."
    elif educational_level == 'Avanzado':
        return "Analizar y resolver problemas avanzados de manera crítica."
    else:
        return "Sin objetivos específicos."