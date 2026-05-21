import webbrowser, os
from pathlib import Path

html = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Kudos Preview</title>
<style>
  body {font-family: system-ui; background:#0f0f1a; color:#eee; margin:0; padding:20px;}
  h1 {text-align:center; color:#00ff9d; margin-bottom:40px;}
  .capsula {background:#1a1a2e; border-radius:16px; padding:20px; margin:20px auto; max-width:500px; box-shadow:0 10px 30px rgba(0,0,0,0.5);}
  img {width:100%; border-radius:12px; margin:15px 0;}
  h2 {margin:0 0 10px; color:#00ff9d;}
  .temas span {display:inline-block; background:#00ff9d; color:#000; padding:6px 14px; border-radius:20px; font-size:13px; margin:4px;}
  audio {width:100%; margin:15px 0;}
  .mapa {height:200px; background:#16213e; border-radius:12px; margin:15px 0; display:flex; align-items:center; justify-content:center; color:#666;}
</style></head><body>
<h1>Así verán los usuarios tus cápsulas</h1>

<div class="capsula"><h2>Museo del Prado</h2>
<div class="temas"><span>Cultura</span><span>Historia</span><span>Arte</span></div>
<img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Museo_del_Prado_2016_(25185942199).jpg">
<audio controls src="https://freesound.org/data/previews/620/620282_5674468-lq.mp3"></audio>
<div class="mapa">Mapa interactivo<br><small>Madrid, España</small></div></div>

<div class="capsula"><h2>Alhambra de Granada</h2>
<div class="temas"><span>Arquitectura</span><span>Historia</span><span>Patrimonio</span></div>
<img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Alhambra_de_Granada_2014.jpg">
<div class="mapa">Mapa interactivo<br><small>Granada, España</small></div></div>

<div class="capsula"><h2>Sagrada Familia</h2>
<div class="temas"><span>Arquitectura</span><span>Arte</span><span>Religión</span></div>
<img src="https://upload.wikimedia.org/wikipedia/commons/9/9c/Sagrada_Familia_Barcelona_2023.jpg">
<audio controls src="https://freesound.org/data/previews/620/620282_5674468-lq.mp3"></audio>
<div class="mapa">Mapa interactivo<br><small>Barcelona, España</small></div></div>

</body></html>"""

archivo = Path("vista_previa_final.html")
archivo.write_text(html, encoding="utf-8")
webbrowser.open(str(archivo.absolute()))
print("¡ABIERTO! Ya puedes ver cómo quedarán las cápsulas")