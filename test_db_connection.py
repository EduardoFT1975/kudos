import psycopg2

try:
    conn = psycopg2.connect(
        dbname="kudos_db",
        user="postgres",
        password="Po003785",
        host="localhost",
        port="5432"
    )
    print("Conexión exitosa!")
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    row = cursor.fetchone()
    print("Resultado de la consulta:", row)
    cursor.close()
    conn.close()
except Exception as e:
    print("Error al conectar:", e)