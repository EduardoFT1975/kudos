# kudos_app/management/commands/setup_personal_assistant.py
"""
Comando: python manage.py setup_personal_assistant --user <UID>

Configura el asistente personal del fundador con:
- Plan de hábitos saludables
- Lista inicial de libros recomendados
- Plantilla de diario estoico
- Métricas de salud iniciales
- Vigilancia de criptos top
"""

from django.core.management.base import BaseCommand
from kudos_app.models import (
    User, Habit, LearningItem, JournalEntry, CryptoWatch, StrategicDocument,
)


HABITS = [
    ('💧', 'Beber 2L de agua', 'salud', 7, 'Hidratación constante a lo largo del día.'),
    ('🏃', 'Ejercicio físico 30 min', 'salud', 5, 'Caminar, correr, gimnasio o yoga.'),
    ('😴', 'Dormir 7-8h', 'salud', 7, 'Acostarse y levantarse a horas regulares.'),
    ('🥗', 'Comer real (sin ultraprocesados)', 'salud', 6, 'Ingrediente único + verdura + proteína.'),
    ('📚', 'Leer 30 min', 'aprendizaje', 7, 'Libros físicos, papers, ensayos. NO redes sociales.'),
    ('✍', 'Escribir en el diario', 'aprendizaje', 7, 'Mañana: intención. Noche: examen estoico.'),
    ('🧘', 'Meditar 10 min', 'espiritual', 5, 'Sentarse en silencio, respirar, observar.'),
    ('💪', 'Trabajar en Kudos 2h enfocadas', 'productividad', 5, 'Sin móvil, sin notificaciones, modo profundo.'),
    ('☎', 'Conectar con un ser querido', 'relaciones', 3, 'Llamada o visita real, no chat.'),
    ('💰', 'Revisar finanzas personales', 'finanzas', 1, 'Ingresos, gastos, ahorro. Una vez por semana.'),
]


LEARNING_ITEMS = [
    # Filosofía de vida (estoicismo)
    ('Meditaciones', 'Marco Aurelio', 'libro', 'estoicismo', 1,
     'El manual estoico esencial. Lee uno o dos pasajes al día.'),
    ('Cartas a Lucilio', 'Séneca', 'libro', 'estoicismo', 1,
     'Cartas que se leen como conversación. Ideal para dosificar.'),
    ('El Enquiridión', 'Epicteto', 'libro', 'estoicismo', 1,
     'Manual breve y lacerante sobre lo que depende y no depende de ti.'),

    # Producto / negocio
    ('Zero to One', 'Peter Thiel', 'libro', 'negocio', 1,
     'Ideas no convencionales para construir lo nuevo. Útil para visión Kudos.'),
    ('The Hard Thing About Hard Things', 'Ben Horowitz', 'libro', 'negocio', 2,
     'CEO en realidad: las decisiones difíciles cuando todo va mal.'),
    ('Founders at Work', 'Jessica Livingston', 'libro', 'negocio', 2,
     'Entrevistas con fundadores. Patrones reales, no idealizados.'),

    # Tecnología (para entender lo que se construye)
    ('The Pragmatic Programmer', 'Hunt & Thomas', 'libro', 'tecnología', 3,
     'Para entender cómo piensa un buen ingeniero. Sin tecnicismos extremos.'),
    ('Don\'t Make Me Think', 'Steve Krug', 'libro', 'diseño', 2,
     'Usabilidad web. Lectura rápida y útil para revisar Kudos.'),

    # Filosofía oriental
    ('Tao Te Ching', 'Lao Tzu', 'libro', 'oriental', 2,
     'Sabiduría taoísta condensada. Lee uno por día.'),
    ('Analectas', 'Confucio', 'libro', 'oriental', 2,
     'Conversaciones recogidas por sus discípulos.'),

    # Salud y vida
    ('Por qué dormimos', 'Matthew Walker', 'libro', 'salud', 1,
     'Convencerás a tu yo del futuro de proteger las 8h.'),
    ('Atomic Habits', 'James Clear', 'libro', 'productividad', 1,
     'Sistema concreto para construir hábitos. Útil para tus rutinas.'),

    # Práctica
    ('Aprender Django básico', '', 'curso', 'tecnología', 3,
     'Para entender la app que estás construyendo y poder modificar cosas pequeñas.'),
    ('Mecanografía 60 wpm', '', 'practica', 'productividad', 3,
     'Si vas a teclear mucho los próximos años, invertir 30 min/día durante un mes te ahorra años.'),
]


CRYPTO_WATCH = [
    ('BTC', 'Bitcoin', 'La reserva descentralizada original. Hold a largo, no especulación.'),
    ('ETH', 'Ethereum', 'Plataforma de smart contracts. Posible base de Kudos Bank.'),
    ('SOL', 'Solana', 'Mencionada en tus documentos para Kudos. Vigílala con tesis a 2-3 años.'),
]


JOURNAL_PROMPTS = [
    ('morning', """🌅 INTENCIÓN MATUTINA — Plantilla estoica

1. Hoy probablemente me encontraré con: [ingratos, impacientes, distraídos]. Recordar que su comportamiento no depende de mí.

2. Mi intención hoy es:

3. La virtud que voy a practicar: [coraje / templanza / justicia / sabiduría]

4. Si surge algo difícil, mi respuesta será:

5. Hoy estoy agradecido por:
"""),
    ('evening', """🌙 EXAMEN VESPERTINO — Plantilla estoica

1. ¿Qué hice bien hoy?

2. ¿Qué falla cometí?

3. ¿Qué deber dejé sin cumplir?

4. ¿Qué he aprendido?

5. ¿Qué intención llevo a mañana?
"""),
]


PERSONAL_DOCS = [
    ('plan.lifestyle.eduardo', 'Plan de Estilo de Vida · Eduardo', 'personal', 'FOUNDER',
     'Plan personal de hábitos, lecturas, salud y reflexión para el fundador anónimo.',
     """# Plan Estilo de Vida · Eduardo (fundador anónimo)

Este es tu plan personal. Su objetivo no es la perfección, es la dirección. Lo revisas cada domingo, lo ajustas cada trimestre.

## Pilares

### 🧘 Filosofía vital
- Estoicismo práctico como brújula. Marco Aurelio, Séneca y Epicteto en rotación.
- Diario diario: intención de mañana, examen de noche.
- Una pregunta semanal: "¿Lo que hice esta semana, lo aprobaría yo a los 80 años?"

### 💪 Salud
- Mover el cuerpo cada día (mínimo caminar 30 min).
- Dormir 7-8h. La cama es sagrada.
- Comer real: sin ultraprocesados como hábito (excepciones puntuales sin culpa).
- Beber agua antes que cualquier otra bebida.

### 📚 Aprendizaje
- 30 min de lectura cada día. Libros, no scroll.
- Un libro al mes mínimo. Mezclar: filosofía, negocio, tecnología, ficción.
- Notas digitales en Kudos: cápsulas de lo aprendido.

### 💼 Trabajo
- 2 horas de "deep work" sin interrupciones cada día. Móvil en otra habitación.
- El resto del día: ejecución, correos, conversaciones.
- Domingo: planificar la semana en 30 min.

### ❤ Relaciones
- Una llamada o visita real a alguien que importa, mínimo cada semana.
- "Ningún logro vale si lo celebras solo."

### 💰 Finanzas
- Vivir por debajo de tus medios.
- Ahorro mensual automático antes de gastar.
- No tomar decisiones de inversión cuando estés exaltado o asustado.

## Reglas para épocas difíciles

1. **Si estoy ansioso**: 10 minutos de meditación + caminar sin móvil.
2. **Si estoy bloqueado en Kudos**: salir a la calle 1h, consultar a un personaje histórico en /assistant/characters/.
3. **Si pierdo el norte**: releer el Manifiesto y mi propio Plan Estilo de Vida.

## Compromisos no negociables

1. **Nunca comprometer la ética de Kudos** por urgencia o presión externa.
2. **Nunca trabajar 7 días seguidos** sin un día completo de descanso.
3. **Nunca tomar decisiones financieras importantes en menos de 24h** de reflexión.

## Métricas semanales que reviso (cada domingo)

- ¿Cuántos hábitos cumplí esta semana? (objetivo >70%)
- ¿Cuántas páginas leí?
- ¿Cuántas horas de sueño promedio?
- ¿Cuántas horas de deep work en Kudos?
- ¿Hablé con alguien que me importa?
- ¿Escribí en el diario?

---

**Versión 1.0 · Mayo 2026 · Revisión trimestral**

> *"Lo que me cae sobre la cabeza no es lo que importa, sino mi respuesta a ello." — Marco Aurelio*
"""),
    ('plan.assistant.usage', 'Cómo usar tu Asistente Personal', 'personal', 'FOUNDER',
     'Guía rápida de tu asistente personal dentro de Kudos.',
     """# Cómo usar tu Asistente Personal

Tu asistente vive en `/personal/`. Tiene varias secciones:

## 📔 Diario estoico (`/personal/journal/`)
- Cada mañana: 2 minutos para escribir tu intención del día.
- Cada noche: 2 minutos para examinar tu día.
- Plantillas estoicas predefinidas — sólo tienes que rellenar.

## ✓ Hábitos (`/personal/habits/`)
- Marca los hábitos que cumpliste cada día.
- El sistema cuenta tu racha (streak) y te avisa si la rompes.

## 📚 Aprendizaje (`/personal/learning/`)
- Lista de libros, cursos, papers, vídeos.
- Marca progreso (0-100%), añade notas, valora del 1 al 5.

## 💪 Salud (`/personal/health/`)
- Registra cada día: horas de sueño, ejercicio, peso, ánimo, energía.
- Ves gráficos semanales y mensuales.

## 🪙 Cripto (`/personal/crypto/`)
- Vigila monedas que te interesan con tus precios objetivo.
- Cuando una toca tu precio, te aparece un aviso. **Tú decides si compras/vendes; el sistema NO ejecuta nada.**
- Log manual de tus operaciones para reflexionar.

## 🎭 Consejo histórico (`/assistant/characters/`)
- Cuando tengas una decisión difícil o quieras reflexionar, consulta a Aristóteles, Séneca, Newton, Cleopatra...
- Cada uno responde con su propia voz y tema.

## Frecuencias recomendadas

| Acción | Frecuencia |
|---|---|
| Diario mañana + noche | Cada día |
| Marcar hábitos | Cada día (al final del día) |
| Registrar salud | Cada día |
| Revisar aprendizaje | Cuando avances en algo |
| Consultar a personaje | Cuando dudes o reflexiones |
| Revisión semanal | Cada domingo, 30 min |
| Revisión mensual | Primer día del mes, 1h |
| Revisión trimestral | Inicio de Q1/Q2/Q3/Q4 |

---

**Versión 1.0**
"""),
]


class Command(BaseCommand):
    help = 'Configura el asistente personal del fundador con plan de vida inicial.'

    def add_arguments(self, parser):
        parser.add_argument('--user', type=str, default='eduardo',
                            help='UID del usuario fundador')

    def handle(self, *args, **options):
        uid = options['user']
        user = User.objects.filter(uid=uid).first()
        if not user:
            self.stdout.write(self.style.ERROR(f'Usuario "{uid}" no existe. Crea uno con createsuperuser.'))
            return

        self.stdout.write(self.style.HTTP_INFO(f'🌿 Configurando asistente personal de {user.alias}...\n'))

        # 1. Hábitos
        self.stdout.write('💪 Hábitos...')
        for icon, name, cat, target, desc in HABITS:
            h, created = Habit.objects.get_or_create(
                user=user, name=name,
                defaults={'icon': icon, 'category': cat,
                          'target_per_week': target, 'description': desc}
            )
            if created:
                self.stdout.write(f'   + {icon} {name}')

        # 2. Items de aprendizaje
        self.stdout.write('\n📚 Plan de aprendizaje...')
        for title, author, type_, tag, priority, notes in LEARNING_ITEMS:
            li, created = LearningItem.objects.get_or_create(
                user=user, title=title,
                defaults={'author': author, 'type': type_,
                          'priority': priority, 'notes': notes,
                          'tags': [tag]}
            )
            if created:
                self.stdout.write(f'   + {title} - {author}')

        # 3. Cripto vigilancia
        self.stdout.write('\n🪙 Vigilancia cripto...')
        for symbol, name, notes in CRYPTO_WATCH:
            cw, created = CryptoWatch.objects.get_or_create(
                user=user, symbol=symbol,
                defaults={'name': name, 'notes': notes}
            )
            if created:
                self.stdout.write(f'   + {symbol} {name}')

        # 4. Plantillas de diario
        self.stdout.write('\n📔 Diario...')
        from datetime import date
        for kind, content in JOURNAL_PROMPTS:
            j, created = JournalEntry.objects.get_or_create(
                user=user, date=date.today(), kind=kind,
                defaults={'content': content, 'mood': 7}
            )
            if created:
                self.stdout.write(f'   + Plantilla {kind}')

        # 5. Documentos personales
        self.stdout.write('\n📄 Documentos personales...')
        from kudos_app.models import Department
        founder_dept = Department.objects.filter(code='FOUNDER').first()
        for code, title, kind, dept_code, summary, body in PERSONAL_DOCS:
            doc, created = StrategicDocument.objects.update_or_create(
                code=code,
                defaults={'title': title, 'kind': kind, 'summary': summary,
                          'body': body, 'department': founder_dept}
            )
            if created:
                self.stdout.write(f'   + {title}')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Asistente personal configurado para {user.alias}'))
        self.stdout.write('   Visita /personal/ para empezar.\n')
