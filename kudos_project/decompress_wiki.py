# decompress_wiki.py
import bz2

input_file = "data\\enwiki-latest-pages-articles.xml.bz2"
output_file = "data\\enwiki-latest-pages-articles.xml"

with bz2.BZ2File(input_file, 'rb') as f_in, open(output_file, 'wb') as f_out:
    f_out.write(f_in.read())

print("Descompresión completada.")