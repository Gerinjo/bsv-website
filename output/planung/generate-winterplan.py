from pathlib import Path
import re
import subprocess
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'BSV_Trainingsplan_Winter_2026-27_Stand_2026-10-27_alle_Mannschaften_C2_C1_je_75_Minuten.pdf'
for name,pattern in [('Regular','DejaVu Sans'),('Bold','DejaVu Sans:style=Bold')]:
    filename=subprocess.check_output(['fc-match','-f','%{file}',pattern],text=True)
    pdfmetrics.registerFont(TTFont(name,filename))
pdfmetrics.registerFontFamily('Regular',normal='Regular',bold='Bold')
green=colors.HexColor('#164f32'); ink=colors.HexColor('#183026'); muted=colors.HexColor('#59685e')
light=colors.HexColor('#f0f5f1'); yellow=colors.HexColor('#fff2d5'); red=colors.HexColor('#8a3521')

def st(name,size=9,leading=13,bold=False,color=ink,after=0):
    return ParagraphStyle(name,fontName='Bold' if bold else 'Regular',fontSize=size,leading=leading,textColor=color,spaceAfter=after)
styles={
 'brand':st('brand',9,13,True,green,9), 'title':st('title',23,29,True,ink,7),
 'intro':st('intro',8.5,12,False,muted,11), 'section':st('section',11,15,True,green,7),
 'body':st('body',8.4,12,False,ink,7), 'small':st('small',7.3,10.2,False,muted,6),
 'cell':st('cell',7.7,10.8), 'team':st('team',7.7,10.8,True), 'head':st('head',7.7,11,True,colors.white),
 'notice':st('notice',8.2,12,False,red),
}
def P(text,kind='cell'):return Paragraph(text,styles[kind])
def cell(text,kind='cell'):
    # Team labels and headers have a fixed style. Within table content, only
    # alternating allocations are emphasized, never individual changed times.
    text=re.sub(r'<b>(.*?)</b>',lambda m:m.group(0) if m.group(1).startswith('Im Wechsel mit ') else m.group(1),text,flags=re.S)
    return P(text,kind)
def table(headers,rows,widths,flags=None):
    t=Table([[P(x,'head') for x in headers]]+[[cell(x,'team' if headers[0]=='Mannschaft' and i==0 else 'cell') for i,x in enumerate(row)] for row in rows],colWidths=[x*mm for x in widths],hAlign='LEFT',repeatRows=1)
    commands=[('BACKGROUND',(0,0),(-1,0),green),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),3.5),('BOTTOMPADDING',(0,0),(-1,-1),3.5),('ROWBACKGROUNDS',(0,1),(-1,-1),[light,colors.HexColor('#fafbfa')]),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#dce5de'))]
    for row,kind in (flags or []):
        commands.append(('BACKGROUND',(0,row+1),(-1,row+1),yellow if kind=='conflict' else colors.HexColor('#e1f1e3')))
    t.setStyle(TableStyle(commands));return t

def heading(brand,title,sub):
    return [P(brand,'brand'),P(title,'title'),P(sub,'intro')]
def notice(text):
    t=Table([[P(text,'notice')]],colWidths=[174*mm]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),yellow),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#e7c790')),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]));return t

story=heading('BSV NORDSTERN RADOLFZELL · WINTER 2026/27','Juniorinnen und Junioren','Arbeitsstand 27. Oktober 2026 · Halle und Kunstrasen · Zur Abstimmung')
rows=[
 ['<b>U6/U7</b>', '—', 'Di 15:30–16:30<br/>Sonnenrainhalle (optional)<br/>Mi 16:00–17:00<br/>Teggingerhalle<br/>Do 16:15–17:15<br/>Sonnenrainhalle'],
 ['<b>F1</b>', 'Mo 16:00–17:00 · KR2', 'Mi 16:00–17:00<br/>Sonnenrainhalle'],
 ['<b>F2/F3</b>', 'Mo 17:00–18:30 · KR2', 'Fr 16:30–18:00<br/>Sonnenrainhalle'],
 ['<b>E1</b>', 'Fr 16:00–17:00 · KR2', 'Di 16:00–17:30<br/>Ratoldushalle'],
 ['<b>E2</b>', 'Mo 17:00–18:30 · KR2', 'Mi 17:00–18:00<br/>Sonnenrainhalle'],
 ['<b>E3</b>', 'Mo 17:00–18:30 · KR2', 'Do 17:15–18:30<br/>Sonnenrainhalle'],
 ['<b>D1</b>', 'Do 17:00–18:30 · KR2', 'Fr 16:00–17:30<br/>BSZ (D1 + D2)'],
 ['<b>D2</b>', 'Do 17:00–18:30 · KR2', 'Fr 16:00–17:30<br/>BSZ (D1 + D2)'],
 ['<b>D3</b>', '—', 'Mo 15:30–17:00<br/>Sonnenrainhalle'],
 ['<b>C1</b>', 'Do 17:00–18:30 · KR2<br/>Fr 17:15–18:30 · KR2<br/>mit FC03 B1', '—'],
 ['<b>C2</b>', 'Mo 17:00–18:30 · KR1<br/>Fr 16:00–17:15 · KR2', '—'],
 ['<b>B-Junioren</b><br/>SG BSV B', 'Mo 18:30–20:00 · KR2<br/>Mi 18:30–20:00 · KR2', '—'],
 ['<b>A-Junioren</b><br/>SG Markelfingen', 'Di 18:30–20:00 · KR1<br/>Do 20:00–21:30 · KR1', '—'],
 ['<b>D-Juniorinnen</b>', 'Mo 17:00–18:30 · KR2<br/>Mi 17:00–18:30 · KR2', '—'],
 ['<b>C-Juniorinnen</b>', 'Mo 18:30–20:00 · KR1<br/>Mi 17:00–18:30 · KR2', '—'],
 ['<b>B-Juniorinnen</b>', 'Mo 18:30–20:00 · KR1<br/>Mi 17:00–18:30 · KR2', '—'],
]
story+=[table(['Mannschaft','Kunstrasen','Halle'],rows,[42,62,70]),Spacer(1,8),
 P('<b>Tauschpartner FC D1:</b> erhält auf KR2 den bisherigen F2/F3-Termin am Dienstag, 17:00–18:30 Uhr.','small'),
 P('KR1 = alter Kunstrasen · KR2 = neuer Kunstrasen · — = kein Trainingsfenster eingeplant. Herren, Damen und AH: Seite 2. Kunstrasen-Zuteilung mit Teilflächen: Seite 5.','small'),PageBreak()]

story+=heading('BSV NORDSTERN RADOLFZELL · WINTER 2026/27','Herren, Damen und AH','Arbeitsstand 27. Oktober 2026 · Halle und Kunstrasen · Zur Abstimmung')
story+=[table(['Mannschaft','Kunstrasen','Halle'],[
 ['<b>Herren 1</b>','Di 20:00–21:30 · KR2<br/>Do 18:30–20:00 · KR2','—'],
 ['<b>Herren 2 / SGM-BSV</b>','Mi 20:00–21:30 · KR1','—'],
 ['<b>Damen 1</b>','Mo 20:00–21:30 · KR1','—'],
 ['<b>Damen 2</b>','Mo 20:00–21:30 · KR1','—'],
 ['<b>AH / Alte Herren</b>','—','Mi 20:00–21:30<br/>Teggingerhalle'],
],[47,73,54]),Spacer(1,10),
 P('— = kein Trainingsfenster eingeplant. Die Teilflächen auf dem Kunstrasen sind auf Seite 5 aufgeführt. In der Teggingerhalle verbleiben Mittwoch 21:30–22:00 Uhr als Restzeit unter 45 Minuten.','small'),
 P('Der Eintrag „FC03 AH“ am Montag 20:00–21:30 Uhr auf KR2 gehört zum FC Radolfzell. Er wird nicht als BSV-Zuteilung geführt.','small'),Spacer(1,10),
 P('Noch unbesetzte BSV-Hallenfenster','section'),
 table(['Anlage','Tag','Uhrzeit','Umfang'],[
 ['Untersee-Gymnastikhalle','Dienstag','17:00–18:30','90 Min.'],
 ['Ratoldus-Gymnastikhalle','Freitag','17:00–18:00','60 Min.'],
 ],[67,28,36,43]),Spacer(1,7),
 P('Zusätzliche städtische Optionen ohne BSV-Zuteilung werden auf Seite 4 gesondert geführt. Die AH erhalten durch diese Planung keinen zusätzlichen Kunstrasenplatz.','small'),
 PageBreak()]

story+=heading('HALLENBELEGUNG','BSV-Hallenbelegung','Grün = freie BSV-Zeitfenster · optional = Durchführung noch offen')
def hall(title,rows,flags=None):
    story.extend([P(title,'section'),table(['Tag','Uhrzeit','Belegung','Dauer'],rows,[28,30,98,18],flags),Spacer(1,6)])
hall('Sonnenrainhalle',[
 ['Montag','15:30–17:00','D3','90 Min.'],
 ['Dienstag','15:00–15:30','Restzeit · unter 45 Minuten, keine Trainingsoption','30 Min.'],
 ['Dienstag','15:30–16:30','U6/U7 (optional)','60 Min.'],
 ['Mittwoch','16:00–17:00','F1','60 Min.'],
 ['Mittwoch','17:00–18:00','E2','60 Min.'],
 ['Donnerstag','16:15–17:15','<b>U6/U7</b>','60 Min.'],
 ['Donnerstag','17:15–18:30','E3','75 Min.'],
 ['Freitag','16:30–18:00','F2/F3','90 Min.'],
])
hall('Ratoldushalle', [
 ['Dienstag','16:00–17:30','E1','90 Min.'],
 ['Mittwoch','20:15–22:00','BSV Bogenschießen','105 Min.'],
])
hall('Teggingerhalle',[
 ['Mittwoch','16:00–17:00','<b>U6/U7</b>','60 Min.'],
 ['Mittwoch','20:00–21:30','<b>AH / Alte Herren</b>','90 Min.'],
 ['Mittwoch','21:30–22:00','Restzeit · unter 45 Minuten, keine Trainingsoption','30 Min.'],
])
hall('BSZ – gesamte Halle',[
 ['Freitag','16:00–17:30','D1 + D2','90 Min.'],
])
hall('Untersee-Gymnastikhalle',[
 ['Dienstag','17:00–18:30','Frei','90 Min.'],
],[(0,'free')])
hall('Ratoldus-Gymnastikhalle',[
 ['Freitag','17:00–18:00','Frei','60 Min.'],
],[(0,'free')])
story+=[P('<b>19 Stunden BSV-Hallenzeiten: 14½ Stunden verplant, 1 Stunde optional für U6/U7, 2½ Stunden als Trainingsfenster frei, 1 Stunde Restzeit.</b> Zusätzliche städtische Optionen sind darin nicht enthalten.','small'),PageBreak()]

story+=heading('OFFENE PLANUNG & ZUSÄTZLICHE OPTIONEN','Was noch zu klären ist','Montag–Freitag ab 15:00 Uhr · Optionen ab 45 Minuten · Gymnastikhallen bis 20:00 Uhr')
story+=[table(['Thema','Aktueller Stand'],[
 ['<b>BSZ · D1 und D2</b>','Fr 16:00–17:30 Uhr: D1 + D2, gesamte Halle.'],
 ['<b>C1 / D3 · Kunstrasen</b>','C1: Do 17:00–18:30 Uhr KR2 und Fr 17:15–18:30 Uhr KR2 mit FC03 B1. D3: kein Kunstrasentermin.'],
 ['<b>B-/C-Juniorinnen / AH</b>','B-/C-Juniorinnen: Mo 18:30–20:00 Uhr KR1 und Mi 17:00–18:30 Uhr KR2. AH: Mi 20:00–21:30 Uhr Teggingerhalle.'],
 ['<b>E2 / E3 · Halle</b>','E2: Mi 17:00–18:00 Uhr Sonnenrainhalle. E3: Do 17:15–18:30 Uhr Sonnenrainhalle.'],
 ['<b>C2 · Kunstrasen</b>','Mo 17:00–18:30 Uhr KR1 und Fr 16:00–17:15 Uhr KR2.'],
 ['<b>U6/U7 · Zusatztermin</b>','Di 15:30–16:30 Uhr Sonnenrainhalle (optional). Durchführung noch offen. Mi 16:00–17:00 Uhr Teggingerhalle und Do 16:15–17:15 Uhr Sonnenrainhalle bleiben bestehen.'],
 ['<b>Freitag · KR2</b>','C2: 16:00–17:15 Uhr. C1: 17:15–18:30 Uhr. Je 75 Minuten. E1 bleibt 16:00–17:00 Uhr eingeplant. FC03 B1 ist ab 17:00 Uhr eingetragen und teilt den Anteil bis 17:15 Uhr mit C2, danach mit C1.'],
 ['<b>Abgleich Markelfingen</b>','SG B-Junioren Mi 18:30–20:00 auf <b>KR2</b>. B-/C-Juniorinnen: Mo KR1 und Mi KR2. D-Juniorinnen übernehmen Mo 17:00–18:30 auf KR2 den E1-Anteil neben E2/E3 und behalten den Mittwoch. Alle Zuteilungen: Seite 5.'],
 ],[47,127]),Spacer(1,7),
 P('Zusätzliche Zeitfenster im städtischen Gesamtplan','section'),
 P('Laut städtischem Plan unbelegt, aber ohne BSV-Zuteilung. Vergabe und gegebenenfalls Schließzeit bei der Stadt bestätigen lassen.','body'),
 table(['Halle','Tag','Uhrzeit','Planstatus'],[
 ['Teggingerhalle','Dienstag','16:00–17:00','Zwischen Schulende und Ringen nicht belegt'],
 ['BSZ · beide Teile','Freitag','ab 21:00','Nach letzter eingetragener Belegung; Schließzeit klären'],
 ['Untersee-Gymnastikhalle','Montag','17:00–18:00','Zwischen Schulende und Boxen nicht belegt'],
 ['Untersee-Gymnastikhalle','Mittwoch','17:00–18:00','Zwischen Schulende und Boxen nicht belegt'],
 ['Untersee-Gymnastikhalle','Donnerstag','19:00–20:00','Nach letzter eingetragener Belegung; Zuteilung und Öffnung klären'],
 ],[47,29,30,68]),Spacer(1,7),
 P('<b>Planungsgrenzen:</b> Nur Montag bis Freitag ab 15:00 Uhr; Optionen unter 45 Minuten sind ausgeschlossen. In beiden Gymnastikhallen enden alle Zeitfenster spätestens um 20:00 Uhr. Die BSZ-Option ab 21:00 Uhr setzt eine bestätigte Nutzungsdauer von mindestens 45 Minuten voraus. Teggingerhalle Mo/Do 20:00–22:00 durch FC Radolfzell belegt.','small'),Spacer(1,8),
 P('Grundlage und Gültigkeit','section'),
 P('Grundlage: acht städtische Hallenpläne vom 22.10.2026 und vorläufiger Kunstrasenplan von Michael Jentsch, Stand 26.10.2026 (02.11.2026–04.04.2027), mit den abgestimmten Mannschaftszuordnungen vom 27.10.2026. Der Abgleich mit dem Gesamtplan steht auf Seite 5.','small'),
 P('<b>Arbeitsstand auf dem Papier. Noch keine abschließende Gesamtzuteilung oder verbindliche Veröffentlichung.</b>','small')]

story+=[PageBreak()]
story+=heading('KONTROLLE ALLER BSV-/SG-KUNSTRASENZEITEN','Zuteilung und Mannschaften','Abgleich mit dem vorläufigen Gesamtplan vom 26.10.2026 · interne Zuordnung nach den Änderungen vom 27.10.2026')
story+=[
 P('A und B bezeichnen die obere und untere Belegungszeile des jeweiligen Zeitblocks im Gesamtplan. Sie zeigen parallele Teilflächen, keine feste Himmelsrichtung. A+B bedeutet, dass beide Zeilen dem BSV zugeordnet sind.','small'),
 table(['Tag / Zeit','Platz','Anteil','Aktuelle Zuordnung','Abgleich'],[
  ['Mo 16:00–17:00','KR2','gesamt','F1','verplant'],
  ['Mo 17:00–18:30','KR1','B','C2','verplant'],
  ['Mo 17:00–18:30','KR2','A','F2/F3','verplant'],
  ['Mo 17:00–18:30','KR2','B','D-Juniorinnen + E2/E3','nachführen'],
  ['Mo 18:30–20:00','KR1','A','B- und C-Juniorinnen','nachführen'],
  ['Mo 18:30–20:00','KR2','A','SG B-Junioren','verplant'],
  ['Mo 20:00–21:30','KR1','A','Damen 1','verplant'],
  ['Mo 20:00–21:30','KR1','B','Damen 2','verplant'],
  ['Di 18:30–20:00','KR1','B','SG A-Junioren + FC03 C1','abstimmen'],
  ['Di 20:00–21:30','KR2','A','Herren 1','verplant'],
  ['Mi 17:00–18:30','KR2','A','B- und C-Juniorinnen','verplant'],
  ['Mi 17:00–18:30','KR2','B','D-Juniorinnen','verplant'],
  ['Mi 18:30–20:00','KR2','A','SG B-Junioren','verplant'],
  ['Mi 20:00–21:30','KR1','B','Herren 2 / SGM-BSV','verplant'],
  ['Do 17:00–18:30','KR2','A','D1 / D2 / C1','nachführen'],
  ['Do 18:30–20:00','KR2','A','Herren 1','verplant'],
  ['Do 20:00–21:30','KR1','B','SG A-Junioren','verplant'],
  ['Fr 16:00–17:00','KR2','gesamt','E1 + C2','neu eintragen'],
  ['Fr 17:00–17:15','KR2','A','C2 + FC03 B1','nachführen'],
  ['Fr 17:15–18:30','KR2','A','C1 + FC03 B1','nachführen'],
 ],[33,16,17,83,25]),
 Spacer(1,8),
 P('<b>Ergebnis:</b> Alle 17 BSV-/SG-Einträge des Gesamtplans sind zugeordnet. Freitag auf KR2: C2 16:00–17:15 Uhr und C1 17:15–18:30 Uhr, je 75 Minuten. E1 bleibt 16:00–17:00 Uhr eingeplant. C2 behält den Montag, C1 den Donnerstag. Mehrere Mannschaften in einer Zeile nutzen dieselbe Teilfläche.','body'),
 P('<b>Noch im Gesamtplan nachführen:</b> Montag KR1 C1 → B-/C-Juniorinnen; Montag KR2 E1/E2/E3 → D-Juniorinnen/E2/E3; Donnerstag KR2 D1/D2/D3 → D1/D2/C1. Freitag KR2: 16:00–17:00 E1/C2, 17:00–17:15 C2/FC03 B1, 17:15–18:30 C1/FC03 B1. Mittwoch KR2 C/B-Juniorinnen entspricht der aktuellen Planung. Dienstag KR2 17:00–18:30 ist durch den Tausch bereits FC03 D1 zugeordnet.','small'),
 P('Gelbe Leerfelder des Gesamtplans sind zusätzliche, bislang nicht als BSV-Zuteilung ausgewiesene Optionen. Aus der gemeinsamen Beschriftung mehrerer Mannschaften ergibt sich keine zusätzliche volle Platzfläche. Die interne Flächenaufteilung und die Nutzung mit FC03 C1 bzw. FC03 B1 sind vor Ort abzustimmen.','small'),
]

def footer(c,doc):
    c.setStrokeColor(colors.HexColor('#dce5de'));c.line(18*mm,17*mm,192*mm,17*mm)
    c.setFont('Regular',7.2);c.setFillColor(muted)
    c.drawString(18*mm,12*mm,'BSV Nordstern · Arbeitsstand 27.10.2026 · Winter 2026/27')
    c.drawRightString(192*mm,12*mm,f'Seite {doc.page}')
SimpleDocTemplate(str(OUTPUT),pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=15*mm,bottomMargin=23*mm,title='BSV Trainingsplan Winter 2026/27 – Stand 27.10.2026',author='BSV Nordstern – Planungsübersicht',subject='Vollständige Hallen- und Kunstrasenübersicht mit offenen Zuordnungen').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUTPUT)
