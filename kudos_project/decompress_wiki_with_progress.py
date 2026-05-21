# decompress_wiki_with_progress.py
import bz2
import os

input_file = "data\\enwiki-latest-pages-articles.xml.bz2"
output_file = "data\\enwiki-latest-pages-articles.xml"

# Obtener el tamaño del archivo comprimido
total_size = os.path.getsize(input_file)
print(f"Tamaño total del archivo comprimido: {total_size / (1024**3):.2f} GB")

# Descomprimir con progreso
with bz2.BZ2File(input_file, 'rb') as f_in, open(output_file, 'wb') as f_out:
    bytes_read = 0
    chunk_size = 1024 * 1024  # 1 MB
    while True:
        chunk = f_in.read(chunk_size)
        if not chunk:
            break
        f_out.write(chunk)
        bytes_read += len(chunk)
        progress = (bytes_read / total_size) * 100
        print(f"Progreso: {progress:.2f}% ({bytes_read / (1024**3):.2f} GB procesados)")

print("Descompresión completada.")