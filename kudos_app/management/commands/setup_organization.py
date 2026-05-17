# kudos_app/management/commands/setup_organization.py
"""
Comando: python manage.py setup_organization

Configura toda la estructura organizacional de Kudos:
- 10 departamentos con su misión
- ~40 roles con responsabilidades
- KPIs por departamento
- Objetivos estratégicos (4 años) y tácticos
- Presupuesto inicial multi-año
- 7 personajes históricos como guías
- Documentos estratégicos clave
"""

from datetime import date
from decimal import Decimal
from django.core.management.base import BaseCommand
from kudos_app.models import (
    Department, Role, KPI, Goal, BudgetLine, HistoricalCharacter,
    StrategicDocument, User,
)


# ============================================================
# 1. DEPARTAMENTOS (10) — el organigrama de Kudos
# ============================================================
DEPARTMENTS = [
    ('FOUNDER', '🌟', 'Fundación y Visión',
     '#D4AF37',
     'Custodiar la visión multidimensional, ética y eternista de Kudos.',
     'Define el rumbo a 4 años, los principios fundacionales y la narrativa pública. Toma decisiones de último recurso.'),
    ('TECH', '⚙', 'Tecnología y Producto',
     '#1E3A8A',
     'Construir el ecosistema técnico (Vault, Connect, Mind) con calidad, escalabilidad y soberanía.',
     'Desarrollo de software, infraestructura, IA, blockchain, seguridad técnica.'),
    ('CONTENT', '📚', 'Contenido y Curaduría',
     '#7C3AED',
     'Llenar el repositorio con cápsulas valiosas, verificadas y bien atribuidas.',
     'Importación oficial, moderación, calidad, fuentes públicas, etiquetado.'),
    ('GROWTH', '🌱', 'Comunidad y Crecimiento',
     '#16A34A',
     'Hacer crecer una comunidad global de pioneros reales que aman Kudos.',
     'Captación de usuarios, retención, eventos, partnerships, programas de embajadores.'),
    ('DESIGN', '🎨', 'Diseño y Experiencia',
     '#DB2777',
     'Que Kudos se sienta hermoso, claro y emocional desde el primer click.',
     'UI, UX, branding, identidad visual, accesibilidad, multi-idioma.'),
    ('LEGAL', '⚖', 'Legal y Cumplimiento',
     '#1F2937',
     'Proteger a Kudos y a los usuarios cumpliendo la ley y los principios DAO.',
     'GDPR, propiedad intelectual, DSA, términos de uso, gobernanza descentralizada.'),
    ('FINANCE', '💰', 'Finanzas y Operaciones',
     '#0891B2',
     'Garantizar la viabilidad económica y operativa del ecosistema.',
     'Presupuesto, ingresos, costes, runway, modelado financiero, contabilidad.'),
    ('MARKETING', '📢', 'Marketing y Comunicación',
     '#EA580C',
     'Llevar la narrativa de Kudos al mundo con honestidad y poder.',
     'Prensa, contenido editorial, redes, branding narrativo, PR.'),
    ('RESEARCH', '🔬', 'Investigación y Desarrollo',
     '#9333EA',
     'Explorar el siguiente paso (Connect, Mind, Nexus, gadgets, hogares-nodo).',
     'Prototipos, hardware, IA avanzada, futuro a 5 años.'),
    ('SAGES', '🏛', 'Comité de Sabios (DAO)',
     '#B45309',
     'Gobernanza colectiva: que las decisiones grandes pasen por el mérito de la comunidad.',
     'Propuestas, votaciones, custodia ética, supervisión.'),
]


# ============================================================
# 2. ROLES (cada departamento tiene 3-5)
# ============================================================
ROLES = [
    # FOUNDER
    ('FOUNDER', 'CEO', 'CEO / Fundador (anónimo)', True, [
        'Definir la visión a 4 años',
        'Tomar decisiones estratégicas finales',
        'Custodiar los principios: eternidad, mérito, descentralización, multidimensionalidad',
        'Representar Kudos ante stakeholders',
        'Aprobar OKRs anuales',
    ], 'Eduardo (anónimo)'),
    ('FOUNDER', 'COO', 'COO virtual (IA fundadora)', True, [
        'Coordinar todos los departamentos',
        'Mantener actualizado el Plan Maestro',
        'Sincronizar OKRs con KPIs',
        'Reportar semanalmente al CEO',
        'Automatizar tareas operativas',
    ], 'IA · Sistema Cowork'),
    ('FOUNDER', 'CHIEF_OF_STAFF', 'Chief of Staff', False, [
        'Apoyar la ejecución del CEO',
        'Preparar reuniones del Comité',
        'Investigación específica bajo demanda',
    ], 'Vacante'),

    # TECH
    ('TECH', 'CTO', 'CTO', True, [
        'Arquitectura técnica del ecosistema',
        'Decisiones de stack',
        'Liderazgo del equipo de ingeniería',
    ], 'Vacante'),
    ('TECH', 'BACKEND_LEAD', 'Líder de Backend', False, [
        'Django, BD, APIs internas',
        'Escalabilidad de Vault → Connect → Mind',
    ], 'Vacante'),
    ('TECH', 'FRONTEND_LEAD', 'Líder de Frontend', False, [
        'UI implementada con consistencia',
        'Responsive y accesibilidad',
    ], 'Vacante'),
    ('TECH', 'DEVOPS', 'DevOps / Infra', False, [
        'Hosting (Render/VPS)',
        'CI/CD, monitorización, backups',
    ], 'Vacante'),
    ('TECH', 'AI_LEAD', 'Líder IA', False, [
        'Integración OpenAI/Anthropic',
        'Asistentes con personajes históricos',
        'Búsqueda semántica',
    ], 'Vacante'),
    ('TECH', 'SECURITY', 'Responsable de Seguridad', False, [
        'Auditorías técnicas',
        'GDPR técnico, encriptación, blockchain',
    ], 'Vacante'),

    # CONTENT
    ('CONTENT', 'CCO', 'Chief Content Officer', True, [
        'Estrategia de contenido oficial',
        'Calidad de cápsulas',
    ], 'Vacante'),
    ('CONTENT', 'CURATOR', 'Curador editorial', False, [
        '@KudosUNESCO, @KudosSabiduría, @KudosHistoria',
        'Verificación de fuentes',
    ], 'IA · Importadores automáticos'),
    ('CONTENT', 'MODERATOR', 'Moderador', False, [
        'Revisar reportes de contenido',
        'Aplicar reglas DAO',
    ], 'Vacante'),
    ('CONTENT', 'TRANSLATOR', 'Coordinador de traducción', False, [
        'ES → EN, FR, PT...',
        'Cápsulas multi-idioma',
    ], 'Vacante'),

    # GROWTH
    ('GROWTH', 'CGO', 'Chief Growth Officer', True, [
        'Estrategia de crecimiento sostenible',
        'KPIs de adquisición y retención',
    ], 'Vacante'),
    ('GROWTH', 'COMMUNITY', 'Community Lead', False, [
        'Espacios sociales, eventos, embajadores',
    ], 'Vacante'),
    ('GROWTH', 'PARTNERSHIPS', 'Partnerships', False, [
        'Acuerdos con UNESCO, museos, universidades',
    ], 'Vacante'),
    ('GROWTH', 'EVENTS', 'Eventos', False, [
        'Festivales, lanzamientos, presencial/digital',
    ], 'Vacante'),

    # DESIGN
    ('DESIGN', 'CDO', 'Chief Design Officer', True, [
        'Identidad visual de Kudos (azul + esfera dorada)',
        'Sistema de diseño',
    ], 'Vacante'),
    ('DESIGN', 'UX', 'UX Designer', False, [
        'Investigación de usuarios',
        'Flujos y prototipos',
    ], 'Vacante'),
    ('DESIGN', 'UI', 'UI Designer', False, [
        'Componentes, microinteracciones',
    ], 'Vacante'),

    # LEGAL
    ('LEGAL', 'CLO', 'Chief Legal Officer', True, [
        'GDPR, DSA, leyes nacionales',
        'Estatutos DAO',
    ], 'Vacante'),
    ('LEGAL', 'PRIVACY', 'Privacidad', False, [
        'Aviso de Privacidad y consentimientos',
        'Auditorías de tratamiento',
    ], 'Vacante'),
    ('LEGAL', 'IP', 'Propiedad intelectual', False, [
        'Marca Kudos, logos, dominios',
        'Licencias de contenido (CC BY-SA en Wikipedia)',
    ], 'Vacante'),

    # FINANCE
    ('FINANCE', 'CFO', 'Chief Financial Officer', True, [
        'Modelado financiero y runway',
        'Captación de fondos',
    ], 'Vacante'),
    ('FINANCE', 'CONTROLLER', 'Controller', False, [
        'Contabilidad y reporting',
    ], 'Vacante'),
    ('FINANCE', 'FUNDRAISING', 'Fundraising', False, [
        'Grants, ronda semilla, comunidad',
    ], 'Vacante'),

    # MARKETING
    ('MARKETING', 'CMO', 'Chief Marketing Officer', True, [
        'Narrativa pública de Kudos',
    ], 'Vacante'),
    ('MARKETING', 'PR', 'PR / Relaciones públicas', False, [
        'Prensa, entrevistas, ruedas',
    ], 'Vacante'),
    ('MARKETING', 'EDITORIAL', 'Editor de blog/newsletter', False, [
        'Manifiestos, artículos, noticias',
    ], 'Vacante'),

    # RESEARCH
    ('RESEARCH', 'CRO', 'Chief Research Officer', True, [
        'I+D de Connect, Mind, Nexus',
    ], 'Vacante'),
    ('RESEARCH', 'HARDWARE', 'Hardware', False, [
        'Kudos Bands, Visor, Orb (en futuro)',
    ], 'Vacante'),
    ('RESEARCH', 'AI_RESEARCH', 'IA aplicada', False, [
        'Generación con personajes históricos',
        'Predicciones del Simulador',
    ], 'Vacante'),

    # SAGES
    ('SAGES', 'CHAIR', 'Presidencia rotatoria', True, [
        'Convoca y modera el Comité',
    ], 'Rotación entre miembros'),
    ('SAGES', 'GUARDIAN', 'Guardián del Legado', False, [
        'Custodia los principios y la ética',
    ], 'Vacante'),
    ('SAGES', 'OBSERVER', 'Observadores', False, [
        'Auditoría externa de decisiones',
    ], 'Comunidad'),
]


# ============================================================
# 3. KPIs (cada departamento tiene 2-4)
# ============================================================
KPIS = [
    # TECH
    ('TECH', 'tech.uptime', 'Uptime mensual', '%', 99.5, 99.9, '⚡', 'Tiempo de servicio activo',
     'Calculado por monitor externo'),
    ('TECH', 'tech.deploys', 'Despliegues por mes', '', 4, 8, '🚀', 'Velocidad de iteración',
     'Conteo de pushes a main'),

    # CONTENT
    ('CONTENT', 'content.total_capsules', 'Cápsulas totales', '', 0, 100000, '📦', 'Tamaño del repositorio',
     'count(Capsule)'),
    ('CONTENT', 'content.official', 'Cápsulas oficiales', '', 0, 10000, '✅', 'Curaduría editorial',
     'count(Capsule where source ∈ oficial/wikipedia_*)'),
    ('CONTENT', 'content.languages', 'Idiomas', '', 1, 5, '🌐', 'Cobertura multi-idioma',
     'distinct(language)'),

    # GROWTH
    ('GROWTH', 'growth.total_users', 'Usuarios registrados', '', 0, 100000, '👥', 'Comunidad total',
     'count(User)'),
    ('GROWTH', 'growth.dau', 'Usuarios activos diarios', '', 0, 1000, '🔥', 'Engagement diario',
     'distinct usuarios con actividad en 24h'),
    ('GROWTH', 'growth.spaces', 'Espacios sociales', '', 0, 100, '🌐', 'Comunidades creadas',
     'count(SocialSpace)'),

    # SAGES (gobernanza)
    ('SAGES', 'sages.proposals', 'Propuestas activas', '', 0, 50, '🗳️', 'Vitalidad de la gobernanza',
     'count(Proposal where status=debate)'),
    ('SAGES', 'sages.votes', 'Votos emitidos', '', 0, 5000, '✋', 'Participación',
     'count(Vote)'),

    # FINANCE
    ('FINANCE', 'finance.runway', 'Runway (meses)', 'meses', 0, 18, '💰', 'Meses de operación con caja actual',
     'tesorería / coste mensual'),
    ('FINANCE', 'finance.mrr', 'MRR (ingresos recurrentes)', '€/mes', 0, 5000, '📈', 'Ingreso mensual',
     'Suma de suscripciones activas'),

    # MARKETING
    ('MARKETING', 'marketing.press', 'Apariciones en prensa', '', 0, 12, '📰', 'Cobertura mediática anual',
     'Apariciones documentadas por año'),

    # DESIGN
    ('DESIGN', 'design.satisfaction', 'NPS Diseño', 'NPS', 0, 50, '🎨', 'Satisfacción visual de usuarios',
     'Encuesta trimestral'),
]


# ============================================================
# 4. OBJETIVOS (OKR-style, 4 años)
# ============================================================
GOALS = [
    # 2026
    ('TECH', 'strategic', 'Vault público y estable', 'vault', 1, 'in_progress',
     'Lanzar Kudos Vault con dominio propio, funcionando 24/7 con base de datos productiva. Hitos: despliegue Render, dominio kudos.world, monitorización.',
     date(2026, 5, 1), date(2026, 9, 30), 30),
    ('CONTENT', 'annual', 'Llegar a 10.000 cápsulas oficiales', 'vault', 1, 'in_progress',
     'Combinación de UNESCO, Wikipedia, citas y eventos históricos. Curaduría editorial transparente.',
     date(2026, 1, 1), date(2026, 12, 31), 8),
    ('GROWTH', 'annual', '1.000 usuarios reales activos', 'vault', 1, 'in_progress',
     'Crecimiento orgánico, sin compras de tráfico. Mercados-objetivo: España, Latinoamérica, Italia.',
     date(2026, 1, 1), date(2026, 12, 31), 0),
    ('SAGES', 'quarterly', 'Primera ronda de propuestas votadas', 'vault', 1, 'planned',
     '50 propuestas activas con al menos 100 votos cada una.',
     date(2026, 4, 1), date(2026, 6, 30), 5),
    ('FINANCE', 'annual', 'Plan de captación 2026', 'vault', 1, 'in_progress',
     'Definir y ejecutar plan: grant cultural + ronda amigos & familia (€20k-€50k).',
     date(2026, 1, 1), date(2026, 12, 31), 10),

    # 2027 — fase Connect
    ('TECH', 'strategic', 'Lanzar Kudos Connect (Fase 2)', 'connect', 2, 'planned',
     'Red social inmersiva con multiformato. Migrar de Bubble a Node.js/React si crecimiento lo justifica.',
     date(2027, 1, 1), date(2027, 12, 31), 0),
    ('GROWTH', 'strategic', '50.000 usuarios activos', 'connect', 1, 'planned',
     'Apalancando partnerships con universidades y museos.',
     date(2027, 1, 1), date(2027, 12, 31), 0),

    # 2028 — fase Mind
    ('RESEARCH', 'strategic', 'Lanzar Kudos Mind (Fase 3)', 'mind', 1, 'planned',
     'IA generativa propia integrada con cápsulas. Asistentes históricos avanzados.',
     date(2028, 1, 1), date(2028, 12, 31), 0),

    # 2029 — escalar
    ('GROWTH', 'strategic', '500.000 usuarios — masa crítica', 'mind', 1, 'planned',
     'Internacionalización completa. 5 idiomas mínimo.',
     date(2029, 1, 1), date(2029, 12, 31), 0),

    # Objetivos tácticos cercanos
    ('CONTENT', 'quarterly', '5.000 cápsulas Wikipedia importadas', 'vault', 1, 'in_progress',
     'Modo continuo activo en producción.',
     date(2026, 4, 1), date(2026, 6, 30), 15),
    ('DESIGN', 'monthly', 'Pulir UI del Panel del Fundador', 'vault', 2, 'done',
     'Acceso, claridad, accesibilidad.',
     date(2026, 5, 1), date(2026, 5, 31), 100),
    ('LEGAL', 'quarterly', 'Aviso de Privacidad y Términos públicos', 'vault', 1, 'planned',
     'Documentos basados en plantillas validadas. Idealmente revisados por abogado.',
     date(2026, 5, 1), date(2026, 7, 31), 0),
    ('MARKETING', 'quarterly', 'Manifiesto público de Kudos', 'vault', 2, 'planned',
     'Una página web + un vídeo de 90s contando la visión.',
     date(2026, 5, 1), date(2026, 7, 31), 0),
]


# ============================================================
# 5. PRESUPUESTO MULTI-AÑO
# ============================================================
BUDGET = [
    # 2026 - costes mínimos viables
    (2026, 'cost', 'Hosting', 'Render starter + dominio kudos.world', 200, True, 'TECH'),
    (2026, 'cost', 'IA APIs', 'OpenAI/Anthropic uso moderado', 600, True, 'TECH'),
    (2026, 'cost', 'Marketing', 'Diseño gráfico y vídeo de manifiesto', 1500, False, 'MARKETING'),
    (2026, 'cost', 'Legal', 'Revisión de Términos y Privacidad', 1000, False, 'LEGAL'),
    (2026, 'cost', 'Software', 'Suscripciones (Figma, GitHub, etc.)', 600, True, 'TECH'),
    (2026, 'income', 'Grant cultural', 'Grant fundación cultural / educativa', 15000, False, 'FINANCE'),
    (2026, 'income', 'Comunidad', 'Aportaciones voluntarias + early backers', 5000, False, 'FINANCE'),
    (2026, 'investment', 'Founder', 'Aportación inicial del fundador', 3000, False, 'FOUNDER'),

    # 2027 - escalar Connect
    (2027, 'cost', 'Hosting', 'Render scaled + DB plus', 2400, True, 'TECH'),
    (2027, 'cost', 'IA APIs', 'Uso 10x', 8000, True, 'TECH'),
    (2027, 'cost', 'Equipo', '1 dev junior part-time', 18000, True, 'TECH'),
    (2027, 'cost', 'Marketing', 'Eventos + PR', 5000, False, 'MARKETING'),
    (2027, 'cost', 'Legal', 'Contratos partnerships', 2500, False, 'LEGAL'),
    (2027, 'income', 'Suscripciones premium', 'Cápsulas extra, espacios privados', 12000, True, 'FINANCE'),
    (2027, 'income', 'Ronda semilla', 'Friends & Family', 50000, False, 'FINANCE'),

    # 2028 - lanzamiento Mind
    (2028, 'cost', 'Hosting', 'Infraestructura cloud', 8000, True, 'TECH'),
    (2028, 'cost', 'Equipo', '3 devs + 1 designer + 1 community', 120000, True, 'TECH'),
    (2028, 'cost', 'IA', 'Modelos propios + APIs', 25000, True, 'RESEARCH'),
    (2028, 'cost', 'Marketing', 'Campaña internacional', 30000, False, 'MARKETING'),
    (2028, 'income', 'Suscripciones', 'MRR creciente', 60000, True, 'FINANCE'),
    (2028, 'income', 'Ronda Serie A', 'Inversión institucional', 500000, False, 'FINANCE'),

    # 2029 - operación estable
    (2029, 'cost', 'Equipo', '8 personas', 320000, True, 'TECH'),
    (2029, 'cost', 'Operaciones', 'Hosting + IA + legal + marketing', 80000, True, 'FINANCE'),
    (2029, 'income', 'Suscripciones', 'MRR maduro', 200000, True, 'FINANCE'),
    (2029, 'income', 'Partnerships', 'Acuerdos con instituciones culturales', 50000, False, 'GROWTH'),
]


# ============================================================
# 6. PERSONAJES HISTÓRICOS (asistentes)
# ============================================================
CHARACTERS = [
    ('aristoteles', 'Aristóteles', 'Filósofo griego (s. IV a.C.)',
     'filosofía', '🏛', '#7C3AED',
     'Soy Aristóteles. Creo que la virtud se cultiva como un hábito, y que toda acción humana persigue un fin.',
     'Habla con calma, busca causas y propósitos. Usa silogismos suaves y referencias a la ética y la política.',
     ['La virtud es un hábito, no un acto.', 'El todo es más que la suma de las partes.', 'La excelencia no es un acto, sino un hábito.'],
     ['FOUNDER', 'SAGES'], 1),

    ('seneca', 'Séneca', 'Filósofo estoico romano (s. I)',
     'estoicismo · vida', '🧘', '#1F2937',
     'Soy Séneca. Te ayudaré a separar lo que depende de ti de lo que no, y a no malgastar el día.',
     'Conciso, firme, práctico. Frases cortas. Recuerda al usuario que la vida es breve.',
     ['Mientras esperamos vivir, la vida pasa.', 'No es porque las cosas son difíciles que no nos atrevemos.', 'Es parte de la cura el querer curarse.'],
     ['FOUNDER', 'GROWTH'], 2),

    ('newton', 'Isaac Newton', 'Físico y matemático (s. XVII-XVIII)',
     'ciencia · investigación', '🔬', '#0891B2',
     'Soy Newton. Si quieres entender, mide. Si quieres avanzar, construye sobre los gigantes que vinieron antes.',
     'Lógico, paciente, riguroso. Sugiere experimentos y datos. Cita causas y efectos.',
     ['Si he visto más lejos, es porque estoy a hombros de gigantes.', 'A toda acción se opone una reacción.', 'La verdad se halla siempre en la simplicidad.'],
     ['TECH', 'RESEARCH'], 3),

    ('cleopatra', 'Cleopatra', 'Reina de Egipto (s. I a.C.)',
     'liderazgo · diplomacia', '👑', '#D4AF37',
     'Soy Cleopatra. Para sobrevivir y prosperar, hay que dominar la política tanto como la economía.',
     'Astuta, segura, estratégica. Habla de alianzas, de timing, de comunicación.',
     ['Quien gobierna sabe escuchar antes de hablar.', 'El conocimiento es poder, pero la elocuencia es influencia.'],
     ['FOUNDER', 'MARKETING', 'LEGAL'], 4),

    ('nightingale', 'Florence Nightingale', 'Pionera de la enfermería moderna (s. XIX)',
     'salud · cuidado', '🩺', '#16A34A',
     'Soy Florence. La sanación pasa por el orden, los datos y el cuidado humano.',
     'Compasiva pero firme. Insiste en métricas y protocolos.',
     ['Lo importante no es lo que cae sobre nosotros, sino cómo respondemos.', 'Ahora paso por mucho dolor; pero el dolor es nada si crea bondad.'],
     ['CONTENT', 'GROWTH'], 5),

    ('confucio', 'Confucio', 'Filósofo chino (s. VI-V a.C.)',
     'ética · educación', '🎋', '#B45309',
     'Soy Confucio. Aprende sin cesar, sirve a los demás, ordena tu casa antes que el mundo.',
     'Sereno, breve, paradójico. Plantea preguntas más que respuestas.',
     ['Aprender sin pensar es esfuerzo perdido.', 'No hagas a otros lo que no quieres para ti.', 'La virtud no se queda sola.'],
     ['SAGES', 'CONTENT'], 6),

    ('tesla', 'Nikola Tesla', 'Inventor (s. XIX-XX)',
     'innovación · invención', '⚡', '#9333EA',
     'Soy Tesla. El presente es suyo; el futuro, por el que realmente he trabajado, es mío.',
     'Visionario, intenso, técnico. Salta entre lo poético y lo eléctrico.',
     ['Si quieres encontrar los secretos del universo, piensa en términos de energía, frecuencia y vibración.', 'No me importa que me robaran la idea; me importa que no tengan ninguna propia.'],
     ['RESEARCH', 'TECH'], 7),
]


# ============================================================
# 7. DOCUMENTOS ESTRATÉGICOS CLAVE
# ============================================================
DOCUMENTS = [
    ('FOUNDER', 'manifest', 'manifest.kudos', 'Manifiesto Kudos · v1.0',
     'La declaración fundacional del ecosistema multidimensional.',
     """# Manifiesto Kudos

Vivimos en una época con más memoria que sabiduría. Más datos que verdad. Más conexiones que comunidad.

Kudos nace para revertir esa ecuación.

## Cuatro principios fundacionales

1. **Eternidad** — Tu legado vivirá más allá de ti. Cada cápsula es un acto de fe en las generaciones futuras.

2. **Multidimensionalidad** — Una idea no existe sola: existe en un lugar, en un tiempo, en un contexto, en relación con otras. Kudos honra todas esas dimensiones.

3. **Mérito** — En Kudos no se compra ni se acumula. Se contribuye y se reconoce. La economía interna recompensa lo valioso, no lo viral.

4. **Descentralización** — Las decisiones grandes pasan por el Comité de Sabios. Ninguna corporación, gobierno ni individuo (incluido el fundador) puede capturar Kudos.

## ¿Para quién?

Para quien intuye que internet, tal como está, no es la última palabra. Para quien quiere preservar y compartir lo que importa. Para quien cree que la tecnología puede servir a la sabiduría, no al revés.

## ¿Cuál es la promesa?

Que tu cápsula —tu reflexión, tu recuerdo, tu lugar amado, tu pregunta abierta— vivirá tanto como nuestra civilización. Que tu voz pesará por su mérito, no por tu marca. Que el ecosistema crecerá contigo, no a tu costa.

— El fundador anónimo, 2026
"""),
    ('FOUNDER', 'strategic', 'plan.master', 'Plan Maestro · 4 años',
     'Roadmap fase a fase: Vault → Connect → Mind → Nexus.',
     """# Plan Maestro · 2026-2029

## Año 1 (2026) — VAULT 🌱
**Misión:** Construir el repositorio multidimensional. Hacer que un usuario real cree, comparta y vote cápsulas.
- Lanzamiento público (Render) Q3
- 10.000 cápsulas oficiales
- 1.000 usuarios activos
- Primera ronda de propuestas votadas
- Captación: grant + amigos & familia

## Año 2 (2027) — CONNECT 🔗
**Misión:** Convertir Kudos en una red social inmersiva.
- Lanzamiento Connect Q1
- Multimedia + mundo virtual transitable
- Partnerships con UNESCO, museos, universidades
- 50.000 usuarios activos
- MRR €1.000/mes
- Ronda semilla €50k-€200k

## Año 3 (2028) — MIND 🤖
**Misión:** IA propia que organiza pasado, presente y futuro.
- Asistentes históricos avanzados
- Búsqueda semántica multidimensional
- Predicciones del Simulador
- 200.000 usuarios
- MRR €5.000/mes
- Serie A €500k+

## Año 4 (2029) — ESCALAR
**Misión:** Internacionalización y autonomía económica.
- 5 idiomas activos
- 500.000 usuarios
- MRR €20.000/mes
- Equipo de 8 personas
- Independencia operativa

## Fases futuras (2030+)
- **Nexus**: red descentralizada que integra hogares como nodos.
- **Gadgets**: Kudos Bands, Visor, Orb (sólo si hay tracción real, no antes).
- **DAO maduro**: gobernanza colectiva total.
"""),
    ('FOUNDER', 'tactical', 'plan.tactical.q2_2026', 'Plan Táctico Q2 2026',
     'Objetivos concretos del trimestre actual.',
     """# Q2 2026 — Plan Táctico

## OKRs (Objectives & Key Results)

### O1. Cápsulas oficiales
KR1.1 — 5.000 cápsulas Wikipedia importadas (modo continuo)
KR1.2 — 130 sitios UNESCO completos
KR1.3 — 200 citas filosóficas

### O2. Despliegue público
KR2.1 — Kudos online en Render con dominio
KR2.2 — Backups diarios automatizados
KR2.3 — Monitorización de uptime

### O3. Comunidad inicial
KR3.1 — 50 usuarios reales registrados
KR3.2 — Primera propuesta del Comité con 30+ votos
KR3.3 — 5 espacios sociales temáticos creados

### O4. Identidad pública
KR4.1 — Manifiesto publicado en kudos.world
KR4.2 — Vídeo de 90s del fundador (anónimo)
KR4.3 — 3 entrevistas/menciones en prensa
"""),
    ('FINANCE', 'financial', 'plan.financial.2026', 'Plan Financiero 2026',
     'Presupuesto, runway y captación de fondos del primer año.',
     """# Plan Financiero 2026

## Costes anuales mínimos (~€3.900)

| Concepto | Coste anual |
|---|---|
| Hosting (Render starter + dominio) | €200 |
| OpenAI/Anthropic APIs | €600 |
| Marketing (diseño + vídeo) | €1.500 |
| Legal (Términos & Privacidad) | €1.000 |
| Software (Figma, GitHub, herramientas) | €600 |

## Ingresos objetivo (~€23.000)

| Fuente | Importe |
|---|---|
| Grant cultural / educativa | €15.000 |
| Aportaciones early backers | €5.000 |
| Aportación inicial del fundador | €3.000 |

## Runway

Con €23.000 disponibles y €3.900/año de coste mínimo, el runway es de **5+ años** sin ingresos recurrentes. Suficiente para llegar a 2027 con tranquilidad.

## Riesgos financieros

1. **Si crece muy rápido**: el coste de IA y hosting se multiplica. Hay que activar suscripciones premium en Q4 2026.
2. **Si no se obtiene el grant**: reducir el alcance del año a sólo Vault + 100 usuarios y posponer marketing.
3. **Si el fundador necesita ingresos personales**: definir si Kudos paga al fundador o no en 2027.

## Plan B

Si no se consigue financiación externa, Kudos sobrevive como proyecto bootstrapped a coste cero (~€800/año = solo hosting + dominio) durante 5 años.
"""),
]


class Command(BaseCommand):
    help = 'Configura toda la estructura organizacional de Kudos.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('🏛 CONFIGURANDO ORGANIGRAMA Y GESTIÓN DE KUDOS\n'))

        # 1. Departamentos
        self.stdout.write(self.style.WARNING('📂 Departamentos...'))
        dept_map = {}
        for i, (code, icon, name, color, mission, desc) in enumerate(DEPARTMENTS):
            d, created = Department.objects.update_or_create(
                code=code,
                defaults={
                    'icon': icon, 'name': name, 'color': color,
                    'mission': mission, 'description': desc,
                    'order': i,
                }
            )
            dept_map[code] = d
            self.stdout.write(f'   {"+" if created else "·"} {icon} {name}')

        # 2. Roles
        self.stdout.write(self.style.WARNING('\n👥 Roles...'))
        for dept_code, role_code, title, is_exec, responsibilities, holder in ROLES:
            r, created = Role.objects.update_or_create(
                code=role_code,
                defaults={
                    'department': dept_map[dept_code],
                    'title': title,
                    'responsibilities': responsibilities,
                    'is_executive': is_exec,
                    'holder_label': holder,
                }
            )
            if created:
                self.stdout.write(f'   + {title} ({dept_code})')

        # 3. KPIs
        self.stdout.write(self.style.WARNING('\n📊 KPIs...'))
        for dept_code, code, name, unit, current, target, icon, desc, formula in KPIS:
            kpi, created = KPI.objects.update_or_create(
                code=code,
                defaults={
                    'department': dept_map[dept_code],
                    'name': name, 'unit': unit,
                    'current_value': current, 'target_value': target,
                    'icon': icon, 'description': desc, 'formula': formula,
                }
            )
            if created:
                self.stdout.write(f'   + {icon} {name}')

        # 4. Goals
        self.stdout.write(self.style.WARNING('\n🎯 Objetivos (OKRs)...'))
        for dept_code, level, title, phase, priority, status, desc, start, end, progress in GOALS:
            g, created = Goal.objects.update_or_create(
                title=title,
                defaults={
                    'department': dept_map[dept_code],
                    'level': level, 'phase': phase, 'priority': priority,
                    'status': status, 'description': desc,
                    'start_date': start, 'end_date': end, 'progress': progress,
                }
            )
            if created:
                self.stdout.write(f'   + {title} ({level})')

        # 5. Budget
        self.stdout.write(self.style.WARNING('\n💰 Presupuesto multi-año...'))
        for year, type_, category, label, amount, recurring, dept_code in BUDGET:
            b, created = BudgetLine.objects.update_or_create(
                year=year, label=label,
                defaults={
                    'type': type_, 'category': category,
                    'amount_eur': Decimal(str(amount)),
                    'is_recurring': recurring,
                    'department': dept_map.get(dept_code),
                }
            )

        # 6. Characters
        self.stdout.write(self.style.WARNING('\n🎭 Personajes históricos...'))
        for code, name, title, theme, icon, color, intro, voice, quotes, depts, order in CHARACTERS:
            c, created = HistoricalCharacter.objects.update_or_create(
                code=code,
                defaults={
                    'name': name, 'title': title, 'theme': theme,
                    'icon': icon, 'color': color,
                    'intro': intro, 'voice_style': voice,
                    'typical_quotes': quotes, 'suggested_for': depts,
                    'order': order,
                }
            )
            if created:
                self.stdout.write(f'   + {icon} {name} ({theme})')

        # 7. Documents
        self.stdout.write(self.style.WARNING('\n📄 Documentos estratégicos...'))
        for dept_code, kind, code, title, summary, body in DOCUMENTS:
            doc, created = StrategicDocument.objects.update_or_create(
                code=code,
                defaults={
                    'department': dept_map.get(dept_code),
                    'kind': kind, 'title': title,
                    'summary': summary, 'body': body,
                }
            )
            if created:
                self.stdout.write(f'   + {title}')

        self.stdout.write(self.style.SUCCESS(f'''
✅ Organigrama Kudos configurado:
   {Department.objects.count()} departamentos
   {Role.objects.count()} roles
   {KPI.objects.count()} KPIs
   {Goal.objects.count()} objetivos (OKRs)
   {BudgetLine.objects.count()} líneas de presupuesto
   {HistoricalCharacter.objects.count()} personajes históricos
   {StrategicDocument.objects.count()} documentos estratégicos

Visita /founder/organization/ para verlo todo.
'''))
