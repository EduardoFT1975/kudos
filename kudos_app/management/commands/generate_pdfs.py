# kudos_app/management/commands/generate_pdfs.py
"""
Comando: python manage.py generate_pdfs

Genera PDFs de todos los documentos estratégicos a partir de los .md
en docs/organizacion/. Los guarda en docs/organizacion/pdf/.

Requiere: pip install reportlab markdown
(ya están en requirements.txt)
"""

import os
import re
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand


def render_pdf_simple(input_md_path, output_pdf_path, title="Kudos"):
    """
    Convierte un .md a PDF usando reportlab.
    Renderizado básico (no soporta tablas complejas, pero sí títulos, listas, énfasis).
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        raise RuntimeError(
            "ReportLab no está instalado. Ejecuta: pip install reportlab markdown"
        )

    # Leer markdown
    with open(input_md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Estilos
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='TitleK', fontSize=22, textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=18, alignment=TA_LEFT, fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        name='H1K', fontSize=18, textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=18, spaceAfter=10, fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        name='H2K', fontSize=14, textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=14, spaceAfter=8, fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        name='H3K', fontSize=12, textColor=colors.HexColor('#D4AF37'),
        spaceBefore=10, spaceAfter=6, fontName='Helvetica-Bold',
    ))
    styles.add(ParagraphStyle(
        name='BodyK', fontSize=10.5, leading=15, spaceAfter=6, alignment=TA_LEFT,
    ))
    styles.add(ParagraphStyle(
        name='BulletK', fontSize=10.5, leading=15, leftIndent=18, bulletIndent=8, spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name='QuoteK', fontSize=10.5, leading=15, leftIndent=20,
        textColor=colors.HexColor('#6B7280'), spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name='FooterK', fontSize=8, textColor=colors.HexColor('#9CA3AF'), alignment=TA_CENTER,
    ))

    # Construir documento
    doc = SimpleDocTemplate(
        output_pdf_path, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
    )
    story = []

    # Cabecera fija
    story.append(Paragraph(
        '<font color="#1E3A8A"><b>Kudos</b></font> · '
        '<font color="#D4AF37">Documento oficial</font>',
        styles['BodyK'])
    )
    story.append(Spacer(1, 0.3*cm))

    # Procesar markdown línea a línea (sencillo pero funcional)
    in_code = False
    in_list = False
    lines = md_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        # Bloques de código
        if line.startswith('```'):
            in_code = not in_code
            i += 1
            continue
        if in_code:
            story.append(Paragraph(
                f'<font face="Courier" size="9">{escape_xml(line)}</font>',
                styles['BodyK'])
            )
            i += 1
            continue

        # Líneas vacías
        if not line:
            story.append(Spacer(1, 0.15*cm))
            i += 1
            continue

        # Separadores
        if re.match(r'^---+$', line) or re.match(r'^===+$', line):
            story.append(Spacer(1, 0.3*cm))
            i += 1
            continue

        # Títulos
        if line.startswith('# '):
            story.append(Paragraph(escape_xml(line[2:]), styles['TitleK']))
            i += 1
            continue
        if line.startswith('## '):
            story.append(Paragraph(escape_xml(line[3:]), styles['H1K']))
            i += 1
            continue
        if line.startswith('### '):
            story.append(Paragraph(escape_xml(line[4:]), styles['H2K']))
            i += 1
            continue
        if line.startswith('#### '):
            story.append(Paragraph(escape_xml(line[5:]), styles['H3K']))
            i += 1
            continue

        # Tablas markdown — saltamos las separadoras y formateamos básico
        if re.match(r'^\|.*\|$', line):
            # Recolectar todas las filas de la tabla
            table_lines = []
            while i < len(lines) and re.match(r'^\|.*\|$', lines[i].rstrip()):
                table_lines.append(lines[i].rstrip())
                i += 1
            # Convertir a tabla simple
            rows = []
            for tl in table_lines:
                # Saltar la línea separadora |---|---|
                if re.match(r'^\|[\s:|-]+\|$', tl):
                    continue
                cells = [c.strip() for c in tl.strip('|').split('|')]
                rows.append([Paragraph(parse_inline(c), styles['BodyK']) for c in cells])
            if rows:
                t = Table(rows, hAlign='LEFT')
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EEF1F8')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#E5E7EB')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                story.append(t)
                story.append(Spacer(1, 0.2*cm))
            continue

        # Listas (· o - o *)
        if re.match(r'^\s*[-*·]\s', line):
            text = re.sub(r'^\s*[-*·]\s', '', line)
            story.append(Paragraph(
                f'• {parse_inline(text)}', styles['BulletK'])
            )
            i += 1
            continue

        # Lista numerada
        if re.match(r'^\s*\d+\.\s', line):
            num_match = re.match(r'^\s*(\d+)\.\s(.*)', line)
            num, text = num_match.groups()
            story.append(Paragraph(
                f'{num}. {parse_inline(text)}', styles['BulletK'])
            )
            i += 1
            continue

        # Citas
        if line.startswith('>'):
            text = line.lstrip('>').strip()
            story.append(Paragraph(
                f'<i>{parse_inline(text)}</i>', styles['QuoteK'])
            )
            i += 1
            continue

        # Párrafo normal con énfasis inline
        story.append(Paragraph(parse_inline(line), styles['BodyK']))
        i += 1

    # Pie
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(
        '— Documento generado automáticamente · Kudos · ' +
        Path(input_md_path).name,
        styles['FooterK']
    ))

    doc.build(story)


def escape_xml(text):
    """Escapa caracteres XML para reportlab."""
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;'))


def parse_inline(text):
    """Convierte sintaxis markdown inline a XML de reportlab."""
    text = escape_xml(text)
    # Negrita
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    # Cursiva
    text = re.sub(r'(?<![*])\*([^*]+)\*(?![*])', r'<i>\1</i>', text)
    # Código inline
    text = re.sub(r'`([^`]+)`', r'<font face="Courier">\1</font>', text)
    # Enlaces [texto](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)',
                  r'<link href="\2" color="#1E3A8A"><u>\1</u></link>', text)
    return text


class Command(BaseCommand):
    help = 'Genera PDFs de los documentos en docs/organizacion/.'

    def add_arguments(self, parser):
        parser.add_argument('--source', type=str,
                            default=str(Path(settings.BASE_DIR) / 'docs' / 'organizacion'),
                            help='Carpeta con archivos .md a convertir')
        parser.add_argument('--output', type=str,
                            default=str(Path(settings.BASE_DIR) / 'docs' / 'organizacion' / 'pdf'),
                            help='Carpeta destino para PDFs')

    def handle(self, *args, **options):
        source_dir = Path(options['source'])
        output_dir = Path(options['output'])
        output_dir.mkdir(parents=True, exist_ok=True)

        if not source_dir.exists():
            self.stdout.write(self.style.ERROR(f'No existe {source_dir}'))
            return

        md_files = sorted(source_dir.glob('*.md'))
        if not md_files:
            self.stdout.write(self.style.WARNING('No hay archivos .md.'))
            return

        self.stdout.write(self.style.HTTP_INFO(f'📄 Generando {len(md_files)} PDFs...\n'))

        ok = 0
        errors = 0
        for md_path in md_files:
            pdf_name = md_path.stem + '.pdf'
            pdf_path = output_dir / pdf_name
            try:
                render_pdf_simple(str(md_path), str(pdf_path), title=md_path.stem)
                self.stdout.write(self.style.SUCCESS(f'  ✓ {pdf_name}'))
                ok += 1
            except RuntimeError as e:
                self.stdout.write(self.style.ERROR(f'  ✗ {e}'))
                errors += 1
                break  # Si falta reportlab, parar
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ✗ {pdf_name}: {e}'))
                errors += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ {ok} PDFs generados en {output_dir}'
        ))
        if errors:
            self.stdout.write(self.style.WARNING(f'⚠ {errors} errores'))
