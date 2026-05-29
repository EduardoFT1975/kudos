"""
Seed Humanity Core · T3.2 EJEC Day 1.

Publica las 7 narrativas WHY IT MATTERS Core escritas en T2.7
y los 7 Discovery Shifts de T2.8 seccion 3 en Postgres.

Idempotente: usa UPSERT. Re-ejecutar no duplica.

Uso:
  $ DATABASE_URL=postgresql://... python -m kudos_engine.db.seed.seed_humanity_core
"""
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from kudos_engine.db.database import get_async_sessionmaker
from kudos_engine.db.models.content import Narrative
from kudos_engine.db.models.shift import DiscoveryShift


# ============================================================
# Las 7 narrativas WHY IT MATTERS Core (texto integro de T2.7)
# ============================================================

CORE_NARRATIVES = [
    {
        "poi_id": "wd-Q174045",   # Olduvai Gorge
        "title": "Olduvai Gorge - No eramos los unicos",
        "hook": "Aqui descubrimos que no eramos los unicos.",
        "duration_s": 75,
        "emotion": "asombro",
        "story_score": 94.0,
        "body_md": """**HOOK**

Aqui descubrimos que no eramos los unicos.

**ESCENA**

17 de julio de 1959. Mary Leakey camina sola por una garganta africana de paredes ocres y sol vertical. Su marido Louis esta enfermo en la tienda. Llevan veintiocho anos buscando aqui, en este pliegue de Tanzania llamado Olduvai, sin encontrar lo que vinieron a encontrar. Mary lo encuentra esa manana. Un trozo de hueso brillante en el suelo, asomando entre el polvo. Lo limpia con un cepillo de dientes. Aparece un craneo. No es humano. No es simio. Es algo entre ambos. Tiene 1,75 millones de anos.

Aquel mediodia, Mary regresa a la tienda corriendo. Louis sale a su encuentro, descalzo, sin camisa, con la fiebre alta. Mary le dice una sola frase: "I've got him". Lo tengo.

**MAGNITUD**

Lo que tenia Mary Leakey aquella manana cambio todo. Desenterraron una verdad incomoda: en Africa Oriental, hace dos millones de anos, varias especies de humanos vivian a la vez. *Homo habilis*. *Paranthropus boisei*. *Homo ergaster*. Compartieron territorio, agua, miedo. Una se convirtio en nosotros. Las otras se extinguieron. Aqui se han hallado las herramientas de piedra mas antiguas usadas por nuestros antepasados: lascas afiladas hechas hace 1,9 millones de anos por manos que apenas se parecian a las tuyas.

**CONTRAFACTUAL**

Sin Olduvai no entenderiamos la coexistencia. Pensariamos que la humanidad llego al planeta de un solo trazo, una sola especie, en una sola linea. Olduvai nos enseno que fuimos varios. Y que somos los unicos que quedamos no porque fueramos los mejores, sino porque tuvimos suerte. Los otros tambien eran humanos. Tambien sentian. Tambien miraban las estrellas. Y se fueron. No volveran.

**WHY IT MATTERS**

Hay algo de humildad radical en saber esto. No somos la culminacion. Somos los supervivientes. Cuando miras a otro humano cualquiera estas viendo a uno de los miembros de la unica especie de homínidos que sigue de pie en este planeta. Esa es una verdad nueva. Lleva con nosotros menos de setenta anos.

**CIERRE**

Cuando esta noche te laves las manos, mira tus dedos. Cuenta cinco. La forma en que se mueven, la pinza precisa entre el pulgar y el indice, se moldeo en una garganta de Tanzania bajo el sol de la sabana hace dos millones de anos. Eres mas antiguo de lo que crees. Eres tambien mas reciente. Y eres uno solo, porque los otros se fueron.""",
    },
    {
        "poi_id": "wd-Q1090052",  # Gobekli Tepe
        "title": "Gobekli Tepe - Antes de la agricultura",
        "hook": "Antes de la rueda. Antes de la escritura. Antes de la agricultura. Alguien construyo esto.",
        "duration_s": 80,
        "emotion": "asombro",
        "story_score": 96.0,
        "body_md": """**HOOK**

Antes de la rueda. Antes de la escritura. Antes de la agricultura. Alguien construyo esto.

**ESCENA**

Sureste de Turquia. Cerca de Sanliurfa, en una colina llamada "la montana del ombligo", un campesino local llamado Mahmut Yildiz sabia desde nino que habia piedras grandes enterradas en su tierra. Asomaban tras las lluvias. Nadie les daba importancia. En 1994 un arqueologo aleman llamado Klaus Schmidt llego a verlas. Tenia cuarenta y un anos. Habia leido un informe de los 60 que las mencionaba sin tomarlas en serio. Schmidt si las tomo en serio. Lo que empezo a desenterrar tenia 11.600 anos.

**MAGNITUD**

11.600 anos. Las piramides de Giza son del 2.600 antes de Cristo. Stonehenge es del 3.000 antes de Cristo. Gobekli Tepe es del 9.600 antes de Cristo. Es siete mil anos mas viejo que Stonehenge. Es como si Stonehenge mirara a Gobekli Tepe y dijera: tu eres mi abuelo. Hay mas de doscientas piedras monumentales talladas en forma de T. Pesan hasta dieciseis toneladas. Cazadores-recolectores las levantaron. Personas que aun no sabian cultivar trigo, ni habian inventado la rueda ni la ceramica. Movieron y tallaron bloques de dieciseis toneladas con herramientas de piedra. Y solo se ha excavado el cinco por ciento.

**CONTRAFACTUAL**

Hasta 1994, la teoria estandar era esta: primero agricultura, luego asentamientos, luego templos. Primero la comida. Luego la ciudad. Luego el dios. Gobekli Tepe lo invierte. Aqui hay templo. No hay ciudad. No hay agricultura. La agricultura llego despues. Llego, posiblemente, porque hacia falta alimentar al equipo de constructores. El significado precedio a la supervivencia. La civilizacion no nacio porque tuvieramos hambre. Nacio porque tuvimos sed de algo mas grande.

**WHY IT MATTERS**

Si fuimos primero seres rituales y luego cultivadores, somos criaturas que se hacen civilizadas por presion espiritual. La proxima vez que entres a una iglesia, mezquita, templo, sinagoga. La proxima vez que vayas a una boda o un funeral. La proxima vez que estes en un estadio cantando con miles de extranos, recuerda que ese impulso es probablemente la cosa mas antigua y mas humana que hacemos.

**CIERRE**

A los nueve mil quinientos anos antes de Cristo, alguien decidio que valia la pena trabajar durante anos sin paga, sin escritura para registrarlo, sin saber si los hijos lo verian terminado, en mover una piedra de dieciseis toneladas a una colina vacia para reunirse alli con otros. Eso es lo mas humano que se ha hecho jamas. Cuando dudes si la humanidad tiene sentido, recuerda que aqui alguien lo dio antes de que existiera el sentido.""",
    },
    {
        "poi_id": "wd-Q189780",   # Lascaux
        "title": "Lascaux - Antes de saber escribir, ya sabiamos pintar",
        "hook": "Antes de saber escribir, ya sabiamos pintar lo que amabamos.",
        "duration_s": 75,
        "emotion": "asombro",
        "story_score": 93.0,
        "body_md": """**HOOK**

Antes de saber escribir, ya sabiamos pintar lo que amabamos.

**ESCENA**

12 de septiembre de 1940. Cuatro adolescentes franceses persiguen a un perro llamado Robot por una colina del valle de Dordogne. El perro desaparece por un agujero. Marcel Ravidat, dieciocho anos, se asoma. Decide bajar. Cuando encienden la lampara, las paredes se mueven. No son sombras. Son toros gigantes corriendo. Caballos. Ciervos. Bisontes saltando. Llevan ahi diecisiete mil anos. Sesenta y un anos antes, en Cantabria, una nina llamada Maria de Sautuola, de ocho anos, levanta la cabeza en una cueva oscura. Grita: "Mira, papa, bueyes!" Bisontes rojos y negros corrian por el techo de Altamira. Tenian quince mil anos. El padre tardo el resto de su vida en convencer a la comunidad cientifica de que aquello era real.

**MAGNITUD**

Mas de seiscientas figuras animales en Lascaux. Dos mil imagenes en total. Tecnica de soplado de pigmentos a traves de huesos huecos. Uso del relieve de la roca para sugerir volumen. Pintaron en una oscuridad casi absoluta, iluminados solo por lamparas de grasa de animal, y aun asi acertaron el movimiento.

**CONTRAFACTUAL**

Si nunca hubieramos encontrado estas cuevas, seguiriamos creyendo que el arte es un lujo de la civilizacion. Las cuevas demuestran lo contrario. Cuando alla afuera habia leones cavernarios, frio extremo, hambre cronica y muerte temprana a los treinta anos, alguien entraba en la oscuridad con peligro de perderse, para pintar un caballo. La belleza no es lujo. Es necesidad. Quizas la mas profunda que tenemos.

**WHY IT MATTERS**

Somos la especie que pinta. Mucho antes de tener escritura, ya teniamos arte. Veinticinco mil anos antes de que pudieramos escribir "amo a este caballo", ya lo pintabamos. La primera forma humana de decir "esto importa" no fue el lenguaje hablado ni escrito. Fue la imagen. Los caballos de Lascaux son la primera carta que un humano dejo a otros humanos. Cada vez que sacas el movil para fotografiar algo que te emociona, estas respondiendo a la misma carta.

**CIERRE**

Picasso entro en Altamira en 1902. Tenia veinte anos y todavia no era Picasso. Al salir dijo una sola frase: "Despues de Altamira, todo es decadencia". Cuando vayas a un museo, recuerda que llevas un milenio de retraso respecto a unos chicos de Dordogne y a una nina cantabra que vieron primero lo que tu acabas de descubrir.""",
    },
    {
        "poi_id": "wd-Q1218",     # Jerusalen
        "title": "Jerusalen - La fe humana en 0,9 km cuadrados",
        "hook": "En 0,9 kilometros cuadrados se concentra la mitad de la fe humana.",
        "duration_s": 75,
        "emotion": "conexion",
        "story_score": 95.0,
        "body_md": """**HOOK**

En 0,9 kilometros cuadrados se concentra la mitad de la fe humana.

**ESCENA**

Cierra los ojos un momento. Imagina un cuadrado pequeno, mas pequeno que muchos parques municipales: novecientos metros por novecientos metros. Dentro de ese cuadrado hay tres lugares. El Muro Occidental, ultimo resto del Segundo Templo judio. La Cupula de la Roca, donde el profeta Mahoma ascendio al cielo segun la tradicion islamica. El Santo Sepulcro, donde Jesus fue enterrado y, segun los cristianos, resucito. Tres religiones. Cuatro mil millones de personas vivas. Quince siglos de discordia. Y todo cabe en un cuadrado mas pequeno que el aeropuerto de tu ciudad. Bienvenido a Jerusalen.

**MAGNITUD**

Jerusalen ha sido destruida y reconstruida al menos dos veces, asediada veintitres veces, atacada cincuenta y dos veces, capturada y recapturada cuarenta y cuatro veces. Ningun otro lugar de la Tierra concentra esa densidad de violencia historica por kilometro cuadrado. Y sin embargo sigue ahi. La piedra del Muro Occidental tiene marcas de manos que la han tocado durante dos mil anos. Cuatro mil millones de personas tienen este lugar como parte de su mapa interior. Aunque nunca hayan ido. Aunque no creyeran.

**CONTRAFACTUAL**

Sin Jerusalen, las tres religiones abrahamicas podrian seguir existiendo en mundos paralelos. Con Jerusalen, las tres religiones tienen que mirarse a la cara cada dia. Eso no produce paz. Produce verdad. La verdad de que los humanos no creemos cosas compatibles. La verdad de que el sagrado de uno es el sagrado de otro, y que los dos no caben siempre en el mismo metro cuadrado.

**WHY IT MATTERS**

Es facil pensar la fe como serenidad. Jerusalen recuerda lo contrario. La fe humana es energia. Conflictual, encendida, dispuesta a morir por una piedra. Mas que el petroleo. Mas que el oro. Aqui se ve a sus extremos. Aqui se ve cuando funciona y cuando se descompone. Aqui se ve cuando cura y cuando mata. Jerusalen es la mitad de la pregunta. La otra mitad sigue siendo formulada hoy en Lhasa, en Bodh Gaya, en Mecca y en lugares que no llamamos sagrados pero lo son.

**CIERRE**

Cuando esta semana alguien te haga sentir que cree en algo que no entiendes y le importa demasiado, recuerda Jerusalen. No porque tengas que estar de acuerdo. Sino porque ahora sabes que llevamos dos mil anos sin estar de acuerdo, y aun asi seguimos viniendo. Aun asi seguimos tocando la misma piedra. La fe humana no esta hecha para resolverse. Esta hecha para seguir.""",
    },
    {
        "poi_id": "wd-Q42797",    # Galapagos
        "title": "Galapagos - La vida cambia",
        "hook": "En cinco semanas, un joven de veintiseis anos entendio que la vida cambia.",
        "duration_s": 80,
        "emotion": "aprendizaje",
        "story_score": 94.0,
        "body_md": """**HOOK**

En cinco semanas, un joven de veintiseis anos entendio que la vida cambia.

**ESCENA**

17 de septiembre de 1835. El HMS Beagle echa el ancla frente a una isla cubierta de roca volcanica negra, en el archipielago Galapagos del Pacifico ecuatorial. A bordo hay un naturalista joven, sin tener aun obra publicada, llamado Charles Darwin. Tiene veintiseis anos. Lleva casi cuatro anos viajando alrededor del mundo. Tampoco aqui espera nada extraordinario. Lo que va a ver en las proximas cinco semanas va a cambiar la biologia, la medicina, la psicologia, la sociologia y la idea misma de lo que es un ser vivo.

**MAGNITUD**

Darwin observa pinzones. Pequenos pajaros marrones, casi identicos entre si. Pero algo no encaja. En una isla los pinzones tienen pico fino. En otra isla, gordo. En otra, en forma de garra. Anota la observacion sin entenderla. Coge tortugas gigantes que pesan ciento cincuenta kilos. El gobernador local le dice casualmente: "puedo saber de que isla viene cada tortuga solo por la forma de su caparazon". Darwin lo anota tambien. Veinticuatro anos despues, en 1859, publica un libro de quinientas paginas que cambiara todo lo que sabemos sobre nosotros mismos: *El origen de las especies*. La primera edicion se agota en un solo dia.

**CONTRAFACTUAL**

Sin Galapagos, la evolucion seria una teoria abstracta sin laboratorio observable. Galapagos es el unico lugar del planeta donde puedes ver, in situ, especies que comparten antepasado comun divergiendo por aislamiento geografico. Es el unico lugar donde la teoria se puede tocar. Y sin la evolucion entendida, no entenderiamos nada de lo que somos. Pensariamos que somos una creacion aparte. No tendriamos antibioticos modernos, ni vacunas adaptativas, ni psicologia evolutiva. Sin Galapagos, seriamos analfabetos sobre la vida misma. Incluida la nuestra.

**WHY IT MATTERS**

Lo que Galapagos nos dio fue mas que una teoria cientifica. Nos dio una postura ante el mundo: las cosas que son, no tuvieron que ser. Cambian. Tu cuerpo, tu cerebro, tu lengua materna, tu especie entera, todo es resultado de circunstancias particulares que pudieron haber sido otras. Eso es a la vez aterrador y liberador. Aterrador porque ningun dios te garantiza nada. Liberador porque ningun pasado te condena. Si la vida cambia, tu tambien puedes cambiar. Tu sociedad tambien. Tu especie tambien. Nada es para siempre. Nada esta escrito.

**CIERRE**

Darwin volvio a Inglaterra y nunca volvio a viajar. Pasaba la mayoria de los dias en su jardin, observando lombrices. Una vez le preguntaron por que un cientifico tan famoso pasaba tantas horas mirando lombrices. Respondio que las lombrices eran las verdaderas creadoras de la tierra fertil. Manana, cuando salgas a la calle, mira algo que normalmente no miras. Una hormiga. Una hoja. Las venas de tu mano. Eso es Galapagos. Eso es Darwin.""",
    },
    {
        "poi_id": "wd-Q1737",     # Apollo 11 / Mar Tranquilidad
        "title": "Apollo 11 - La huella permanente",
        "hook": "La huella de Armstrong sigue intacta. Durara un millon de anos mas que tu.",
        "duration_s": 82,
        "emotion": "asombro",
        "story_score": 96.0,
        "body_md": """**HOOK**

La huella de Armstrong sigue intacta. Durara un millon de anos mas que tu.

**ESCENA**

20 de julio de 1969. 20:17, hora universal. Un modulo metalico llamado Eagle se posa sobre el polvo gris del Mar de la Tranquilidad. Adentro hay dos hombres: Neil Armstrong, treinta y ocho anos, y Buzz Aldrin, treinta y nueve. Un tercero, Michael Collins, los espera en orbita. Seis horas y media despues, Armstrong baja por una escalera. Tantea con el pie el primer escalon contra el suelo lunar. Pronuncia diecinueve palabras que la mitad de la humanidad esta escuchando en directo: "Es un pequeno paso para el hombre. Un gran salto para la humanidad". La huella que deja su bota en ese instante sigue ahi.

**MAGNITUD**

La Luna no tiene atmosfera. No tiene viento. No tiene erosion. La huella de Neil Armstrong, mas las otras once dejadas en seis misiones Apollo, seguiran reconocibles durante al menos un millon de anos. Probablemente diez millones. Mientras Stonehenge cede al tiempo. Mientras las Piramides de Giza se erosionan. Mientras esta civilizacion entera podria desaparecer en una era geologica futura, una sola huella humana en el polvo lunar seguira intacta. Es la firma mas duradera que nuestra especie ha dejado en cualquier lugar del cosmos accesible. Solo doce humanos han caminado por la Luna. Despues nadie ha vuelto.

**CONTRAFACTUAL**

Sin Apollo, seriamos una especie atada a un planeta. Hasta julio de 1969, era literalmente cierto que cada humano que jamas habia existido habia muerto y sera enterrado dentro de la atmosfera de su planeta natal. Despues de julio de 1969, esa frase deja de ser cierta. Eso es un cambio cualitativo. No de grado. Somos, desde 1969, la primera especie de la Tierra capaz de salir de la Tierra. La probabilidad calculada de exito completo de la mision era del cincuenta por ciento. Armstrong y Aldrin sabian, al subir al cohete, que tenian una de cada dos chances de morir.

**WHY IT MATTERS**

Hay algo profundamente paradojico en Apollo 11. Fue el resultado de una guerra fria entre dos superpotencias que tenian apuntandose misiles nucleares. Y, sin embargo, lo que dejo fue lo contrario de una arma: una huella civil, sin reclamacion territorial, con una placa que dice: "Vinimos en paz para toda la humanidad". Esa contradiccion es importante. Demuestra que la misma especie capaz de fabricar Hiroshima es capaz de fabricar el primer paso humano en otro mundo. La diferencia no esta en la tecnologia. Esta en para que la dirigimos.

**CIERRE**

El astronauta Charlie Duke, del Apollo 16, dejo en la Luna una foto de su familia. Su mujer y sus dos hijos sonriendo. La foto sigue ahi, en el Mar de los Nubes, junto a su huella. Quedara intacta durante un millon de anos. Esa familia somos todos. Mira esta noche al cielo.""",
    },
    {
        "poi_id": "wd-Q176330",   # Hiroshima Peace Memorial
        "title": "Hiroshima - 8:15",
        "hook": "A las 8:15 del 6 de agosto de 1945, una sola bomba mato a ochenta mil personas en nueve segundos.",
        "duration_s": 85,
        "emotion": "nostalgia",
        "story_score": 96.0,
        "body_md": """**HOOK**

A las 8:15 del 6 de agosto de 1945, una sola bomba mato a ochenta mil personas en nueve segundos.

**ESCENA**

La manana es despejada. Sin nubes. Cielo azul intenso de verano japones. La ciudad de Hiroshima despierta. Trescientas cincuenta mil personas. Tranvias funcionando, ninos camino al colegio, mercaderes abriendo sus tiendas. A las 8:14, un B-29 americano llamado Enola Gay sobrevuela la ciudad a nueve mil seiscientos metros. Lleva en su vientre una bomba apodada Little Boy. Contiene sesenta y cuatro kilos de uranio enriquecido. A las 8:15 y diecisiete segundos, Little Boy es liberada. Tarda cuarenta y cuatro segundos en caer hasta los seiscientos metros sobre el suelo, donde detona. A las 8:15:43, hora local, Hiroshima desaparece.

**MAGNITUD**

En los primeros nueve segundos, ochenta mil personas mueren incineradas o aplastadas. En las semanas siguientes, otras setenta mil mueren por quemaduras y radiacion. Para finales de 1945, la cifra confirmada supera los ciento cuarenta mil. Casi la mitad de la ciudad. A ciento sesenta metros del epicentro habia un edificio civil llamado Salon de Promocion Industrial. Hoy se llama Genbaku Domu. La Cupula de la Bomba Atomica. Es el unico edificio de Hiroshima previo a 1945 que sigue en pie en el centro de la ciudad. Todos los demas se evaporaron. La ciudad reconstruyo todo lo demas. Decidio no reconstruir esa cupula.

**CONTRAFACTUAL**

Sin Hiroshima, el siglo XX y el XXI hubieran sido muy diferentes. Y casi seguramente peores. Antes del 6 de agosto de 1945, las armas nucleares eran una teoria. Nadie habia visto lo que pasaba realmente cuando una se usaba sobre una ciudad real con gente real. Despues del 6 de agosto, todo el mundo lo vio. Los politicos que en los anos siguientes pensaron en usar otras armas nucleares siempre tuvieron una imagen mental que les hizo detenerse. La imagen de Hiroshima. Hiroshima es, paradojicamente, la razon por la que no ha habido una segunda Hiroshima.

**WHY IT MATTERS**

Hoy hay nueve paises con armas nucleares. Tienen alrededor de doce mil cabezas nucleares activas. Una sola de las modernas tiene cien veces la potencia de Little Boy. Cien Hiroshimas en una sola explosion. La amenaza nuclear se ha vuelto invisible, no porque haya desaparecido, sino porque hemos aprendido a no mirarla. Hiroshima es la puerta abierta. Cuando vas, no encuentras un parque tematico. Encuentras un parque de paz. Hay una llama eterna. Hay una estatua de una nina llamada Sadako Sasaki, que intento doblar mil grullas de papel para que se cumpliera su deseo de vivir, y murio antes de terminar. Su mejor amiga termino las grullas.

**CIERRE**

El reloj de pulsera de un trabajador llamado Akito Kawagoe quedo parado en las 8:15. Esta hoy en el Museo Memorial. Lo encontraron entre escombros una semana despues. Su dueno nunca aparecio. Cada peticion de paz que firmes, cada conversacion en la que defiendas la diplomacia frente a la fuerza, cada vez que votes con la guerra en mente, hazlo recordando ese reloj. Lleva ochenta anos marcando la misma hora. Que tu reloj no marque nunca esa misma hora otra vez.""",
    },
]


# ============================================================
# Los 7 Discovery Shifts (de T2.8 seccion 3)
# ============================================================

CORE_SHIFTS = [
    {
        "poi_id": "wd-Q174045", "pillar": "origen", "tier": "core",
        "before_statement": "Soy una creacion aparte. Los humanos somos distintos esencialmente del resto de animales.",
        "discovery_revealed": "En Olduvai coexistieron multiples especies de homo. Una sobrevivio por suerte.",
        "after_statement": "Soy primate evolucionado. Uno de los muchos que pudieron ser. La separacion humano/animal es de grado, no de naturaleza.",
        "identity_shift_from": "elegido", "identity_shift_to": "superviviente entre iguales perdidos",
        "action_potential": "Mirar a otros humanos con conciencia de fragilidad evolutiva compartida; cuestionar reflejos de superioridad de especie.",
        "action_friction": "low",
    },
    {
        "poi_id": "wd-Q1090052", "pillar": "significado", "tier": "core",
        "before_statement": "La civilizacion surgio por necesidad practica. Primero la agricultura, luego la cultura.",
        "discovery_revealed": "El ritual precedio a la agricultura en 11.600 anos. El templo aparecio antes que la ciudad.",
        "after_statement": "Lo humano es buscar significado antes que supervivencia. La civilizacion es hija del rito, no del hambre.",
        "identity_shift_from": "homo economicus", "identity_shift_to": "homo significans",
        "action_potential": "Legitimar el tiempo dedicado a rituales sociales aparentemente improductivos (bodas, conciertos, sobremesas largas).",
        "action_friction": "low",
    },
    {
        "poi_id": "wd-Q189780", "pillar": "belleza", "tier": "core",
        "before_statement": "El arte es un lujo que aparece cuando hay tiempo libre. Primero lo util, despues lo bello.",
        "discovery_revealed": "Pintamos bisontes 25.000 anos antes de saber escribir. La belleza vino antes que la utilidad simbolica.",
        "after_statement": "La belleza no es lujo. Es necesidad humana anterior al lenguaje escrito.",
        "identity_shift_from": "productor practico", "identity_shift_to": "especie estetica",
        "action_potential": "Dejar de juzgar el propio impulso creativo cotidiano como infantil. Reconocer que dibujar, cantar o decorar son actos profundamente humanos.",
        "action_friction": "low",
    },
    {
        "poi_id": "wd-Q1218", "pillar": "creencia", "tier": "core",
        "before_statement": "Las religiones son sistemas serenos de creencia que producen paz interior.",
        "discovery_revealed": "En Jerusalen tres religiones mayores se cruzan fisicamente. Llevan dos mil anos conviviendo sin reconciliarse.",
        "after_statement": "La fe humana es energia conflictual, no opio. Las creencias no se reconcilian: coexisten en tension. Esa tension es senal de profundidad, no de fracaso.",
        "identity_shift_from": "tolerante abstracto", "identity_shift_to": "interlocutor capaz de respetar lo que no comparte",
        "action_potential": "Reconocer al que cree distinto sin pedirle que coincida; dejar de exigir convergencia como condicion de convivencia.",
        "action_friction": "medium",
    },
    {
        "poi_id": "wd-Q42797", "pillar": "conocimiento", "tier": "core",
        "before_statement": "Las cosas que son, tienen que ser como son. Mi caracter, mi sociedad, mi enfermedad: son lo que son.",
        "discovery_revealed": "Todo lo vivo cambia. La permanencia es ilusion. La evolucion es continua incluso ahora mismo.",
        "after_statement": "Yo tambien puedo cambiar. Mi sociedad tambien. Lo que parece eterno solo lleva poco tiempo siendo.",
        "identity_shift_from": "determinado", "identity_shift_to": "evolutivo en curso",
        "action_potential": "Actuar sobre lo modificable de uno mismo o del entorno, en lugar de aceptarlo como destino.",
        "action_friction": "medium",
    },
    {
        "poi_id": "wd-Q1737", "pillar": "exploracion", "tier": "core",
        "before_statement": "Somos especie atada a un planeta. El cosmos es decorado.",
        "discovery_revealed": "Hay 12 huellas humanas en otro mundo. Permanecen 1 millon de anos. Son la firma humana mas duradera.",
        "after_statement": "Somos capaces de salir del planeta. Nada nos limita por defecto. La extension humana es posible.",
        "identity_shift_from": "planetario", "identity_shift_to": "con potencial cosmico",
        "action_potential": "Mirar a la luna con apropiacion; ampliar la escala temporal en que se concibe la accion humana.",
        "action_friction": "low",
    },
    {
        "poi_id": "wd-Q176330", "pillar": "memoria", "tier": "core",
        "before_statement": "Las armas nucleares son disuasion teorica. La guerra es lejos. La extincion es ciencia ficcion.",
        "discovery_revealed": "80.000 muertos en 9 segundos. Hoy hay 9 paises con armas nucleares y 12.000 cabezas activas.",
        "after_statement": "La extincion humana esta dentro del menu de decisiones humanas. No es destino, es eleccion.",
        "identity_shift_from": "espectador", "identity_shift_to": "responsable de la cadena causal",
        "action_potential": "Votar, firmar y conversar con la guerra en mente; defender la diplomacia frente a la fuerza en conversaciones cotidianas.",
        "action_friction": "medium",
    },
]


# ============================================================
# Upsert helpers
# ============================================================

async def seed_narratives(session: AsyncSession) -> int:
    count = 0
    for n in CORE_NARRATIVES:
        stmt = pg_insert(Narrative).values(
            poi_id=n["poi_id"],
            narrative_type="why_it_matters",
            title=n["title"],
            hook=n["hook"],
            duration_s=n["duration_s"],
            emotion=n["emotion"],
            body_md=n["body_md"],
            language="es",
            generated_by="eduardo+claude-manual-T2.7",
            generated_at=datetime.now(timezone.utc),
            tier="core",
            is_canon=True,
            story_score=n["story_score"],
            validation_data={"manual_golden": True, "from": "T2.7"},
            published_at=datetime.now(timezone.utc),
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_narratives_unique_per_poi",
            set_={
                "title": stmt.excluded.title,
                "hook": stmt.excluded.hook,
                "duration_s": stmt.excluded.duration_s,
                "emotion": stmt.excluded.emotion,
                "body_md": stmt.excluded.body_md,
                "tier": stmt.excluded.tier,
                "is_canon": stmt.excluded.is_canon,
                "story_score": stmt.excluded.story_score,
                "validation_data": stmt.excluded.validation_data,
                "published_at": stmt.excluded.published_at,
                "generated_by": stmt.excluded.generated_by,
            },
        )
        await session.execute(stmt)
        count += 1
    print(f"[seed-core] narratives: {count} upserts")
    return count


async def seed_shifts(session: AsyncSession) -> int:
    count = 0
    for s in CORE_SHIFTS:
        stmt = pg_insert(DiscoveryShift).values(
            poi_id=s["poi_id"],
            pillar=s["pillar"],
            tier=s["tier"],
            before_statement=s["before_statement"],
            discovery_revealed=s["discovery_revealed"],
            after_statement=s["after_statement"],
            identity_shift_from=s["identity_shift_from"],
            identity_shift_to=s["identity_shift_to"],
            action_potential=s["action_potential"],
            action_friction=s["action_friction"],
            language="es",
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_discovery_shifts_poi_lang",
            set_={
                "pillar": stmt.excluded.pillar,
                "tier": stmt.excluded.tier,
                "before_statement": stmt.excluded.before_statement,
                "discovery_revealed": stmt.excluded.discovery_revealed,
                "after_statement": stmt.excluded.after_statement,
                "identity_shift_from": stmt.excluded.identity_shift_from,
                "identity_shift_to": stmt.excluded.identity_shift_to,
                "action_potential": stmt.excluded.action_potential,
                "action_friction": stmt.excluded.action_friction,
            },
        )
        await session.execute(stmt)
        count += 1
    print(f"[seed-core] discovery_shifts: {count} upserts")
    return count


async def main():
    SessionLocal = get_async_sessionmaker()
    async with SessionLocal() as session:
        try:
            await seed_narratives(session)
            await seed_shifts(session)
            await session.commit()
            print("[seed-core] OK · commit done")
        except Exception as e:
            await session.rollback()
            print(f"[seed-core] FAILED: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
