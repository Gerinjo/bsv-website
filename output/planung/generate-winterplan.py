from pathlib import Path
import subprocess
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parent
OUTPUT=ROOT/'BSV_Trainingsplan_Winter_2026-27_Stand_2026-10-22_E2-E3_Mittwoch.pdf'
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
 'cell':st('cell',7.7,10.8), 'head':st('head',7.7,11,True,colors.white),
 'notice':st('notice',8.2,12,False,red),
}
def P(text,kind='cell'):return Paragraph(text,styles[kind])
def table(headers,rows,widths,flags=None):
    t=Table([[P(x,'head') for x in headers]]+[[P(x) for x in row] for row in rows],colWidths=[x*mm for x in widths],hAlign='LEFT',repeatRows=1)
    commands=[('BACKGROUND',(0,0),(-1,0),green),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),3.5),('BOTTOMPADDING',(0,0),(-1,-1),3.5),('ROWBACKGROUNDS',(0,1),(-1,-1),[light,colors.HexColor('#fafbfa')]),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#dce5de'))]
    for row,kind in (flags or []):
        commands.append(('BACKGROUND',(0,row+1),(-1,row+1),yellow if kind=='conflict' else colors.HexColor('#e1f1e3')))
    t.setStyle(TableStyle(commands));return t

def heading(brand,title,sub):
    return [P(brand,'brand'),P(title,'title'),P(sub,'intro')]
def notice(text):
    t=Table([[P(text,'notice')]],colWidths=[174*mm]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),yellow),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#e7c790')),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]));return t

story=heading('BSV NORDSTERN RADOLFZELL · WINTER 2026/27','Trainingsübersicht','Arbeitsstand 22. Oktober 2026 · Halle und Kunstrasen · Zur Abstimmung')
rows=[
 ['<b>U6/U7</b>', '—', '<b>Mi 16:00–17:00</b><br/>Teggingerhalle<br/><b>Do 16:15–17:15</b><br/>Sonnenrainhalle'],
 ['<b>F1</b>', 'Mo 16:00–17:00 · KR2', 'Mi 16:00–17:00<br/>Sonnenrainhalle'],
 ['<b>F2/F3</b>', '<b>Mo 17:00–18:30 · KR2</b>', 'Fr 16:30–18:00<br/>Sonnenrainhalle, allein'],
 ['<b>E1</b>', 'Mo 17:00–18:30 · KR2', 'Di 16:00–17:30<br/>Ratoldushalle'],
 ['<b>E2</b>', 'Mo 17:00–18:30 · KR2', 'Mi 17:00–18:00 · Sonnenrainhalle<br/>oder Untersee-Gymhalle (Wunsch)<br/><b>Im Wechsel mit E3</b>'],
 ['<b>E3</b>', 'Mo 17:00–18:30 · KR2', 'Mi 17:00–18:00 · Sonnenrainhalle<br/>oder Untersee-Gymhalle (Wunsch)<br/><b>Im Wechsel mit E2</b>'],
 ['<b>D1</b>', 'Do 17:00–18:30 · KR2', 'Fr 16:00–17:30<br/>BSZ · gemeinsam mit D2<br/><b>Im Wechsel mit D- und C-Juniorinnen</b>'],
 ['<b>D2</b>', 'Do 17:00–18:30 · KR2', 'Fr 16:00–17:30<br/>BSZ · gemeinsam mit D1<br/><b>Im Wechsel mit D- und C-Juniorinnen</b>'],
 ['<b>D3</b>', 'Do 17:00–18:30 · KR2', 'Mo 15:30–17:00<br/>Sonnenrainhalle'],
 ['<b>C1</b>', '<b>Mi 17:00–18:30 · KR2</b>', 'Do 17:15–18:30<br/>Sonnenrainhalle<br/><b>Im Wechsel mit C2</b>'],
 ['<b>C2</b>', 'Mo 17:00–18:30 · KR1', 'Do 17:15–18:30<br/>Sonnenrainhalle<br/><b>Im Wechsel mit C1</b>'],
 ['<b>B-Junioren</b><br/>SG BSV B', 'Mo 18:30–20:00 · KR2<br/>Mi 18:30–20:00 · KR1', 'Kein Hallenplatz vorgesehen'],
 ['<b>A-Junioren</b><br/>SG Markelfingen', 'Di 18:30–20:00 · KR1<br/>Do 20:00–21:30 · KR1', 'Kein Hallenplatz vorgesehen'],
 ['<b>D-Juniorinnen</b>', 'Mi 17:00–18:30 · KR2', 'Fr 16:00–17:30<br/>BSZ · gemeinsam mit C-Juniorinnen<br/><b>Im Wechsel mit D1 und D2</b>'],
 ['<b>C-Juniorinnen</b>', 'Mi 17:00–18:30 · KR2', 'Fr 16:00–17:30<br/>BSZ · gemeinsam mit D-Juniorinnen<br/><b>Im Wechsel mit D1 und D2</b>'],
 ['<b>B-Juniorinnen</b>', '<b>Mo 18:30–20:00 · KR1</b>', '<b>Mi 20:00–21:00</b><br/>Teggingerhalle'],
]
story+=[table(['Mannschaft','Kunstrasen','Halle'],rows,[42,62,70]),Spacer(1,8),
 P('<b>Tauschpartner FC D1:</b> erhält auf KR2 den bisherigen F2/F3-Termin am Dienstag, 17:00–18:30 Uhr.','small'),
 P('KR1 = alter Kunstrasen · KR2 = neuer Kunstrasen · — = kein Eintrag in der bisherigen Übersicht. F2/F3 ist eine Trainingsgruppe und nutzt ihre Hallenzeit allein. Weitere BSV-Mannschaften: Seite 3.','small'),PageBreak()]

story+=heading('HALLENBELEGUNG','BSV-Zeitfenster und Wünsche','Grün = frei innerhalb der BSV-Zuteilung · Wunsch = Bestätigung durch die Stadt offen')
def hall(title,rows,flags=None):
    story.extend([P(title,'section'),table(['Tag','Uhrzeit','Belegung','Dauer'],rows,[28,30,98,18],flags),Spacer(1,6)])
hall('Sonnenrainhalle',[
 ['Montag','15:30–17:00','D3','90 Min.'],
 ['Dienstag','15:00–16:30','FREI','90 Min.'],
 ['Mittwoch','16:00–17:00','F1','60 Min.'],
 ['Mittwoch','17:00–18:00','E2<br/><b>Im Wechsel mit E3</b>','60 Min.'],
 ['Donnerstag','16:15–17:15','<b>U6/U7</b>','60 Min.'],
 ['Donnerstag','17:15–18:30','C1<br/><b>Im Wechsel mit C2</b>','75 Min.'],
 ['Freitag','16:30–18:00','F2/F3 · eine Trainingsgruppe (allein)','90 Min.'],
],[(1,'free')])
hall('Ratoldushalle', [['Dienstag','16:00–17:30','E1','90 Min.']])
hall('Teggingerhalle',[
 ['Mittwoch','16:00–17:00','<b>U6/U7</b>','60 Min.'],
 ['Mittwoch','20:00–21:00','<b>B-Juniorinnen</b>','60 Min.'],
 ['Mittwoch','21:00–22:00','FREI','60 Min.'],
],[(2,'free')])
hall('BSZ – gesamte Halle',[
 ['Freitag','16:00–17:30','D1 + D2 gemeinsam<br/><b>Im Wechsel mit D- und C-Juniorinnen</b><br/>Beide Gruppen nutzen jeweils die gesamte Halle.','90 Min.'],
])
hall('Untersee-Gymnastikhalle',[
 ['Dienstag','17:00–18:30','FREI · BSV-Zuteilung','90 Min.'],
 ['Mittwoch','17:00–18:00','E3<br/><b>Im Wechsel mit E2</b><br/>Wunsch · noch nicht dem BSV zugeteilt','60 Min.'],
],[(0,'free')])
hall('Ratoldus-Gymnastikhalle',[
 ['Freitag','17:00–18:00','<b>FREI · BSV-Zuteilung, Mannschaft noch offen</b>','60 Min.'],
],[(0,'free')])
story+=[P('<b>Freie BSV-Zeitfenster ab 45 Minuten: 5 Stunden pro Woche.</b>','body'),PageBreak()]

story+=heading('OFFENE PLANUNG & ZUSÄTZLICHE OPTIONEN','Was noch zu klären ist','Montag–Freitag ab 15:00 Uhr · Optionen ab 45 Minuten · Gymnastikhallen bis 20:00 Uhr')
story+=[table(['Thema','Aktueller Stand'],[
 ['<b>BSZ-Wechseltermin</b>','Freitag 16:00–17:30 Uhr: D1 und D2 gemeinsam.<br/><b>Im Wechsel mit D- und C-Juniorinnen</b>, die ebenfalls gemeinsam trainieren. Jeweils die gesamte Halle. Der Beginn der Wechselreihenfolge ist noch festzulegen.'],
 ['<b>B-Juniorinnen / C1</b>','Kunstrasentermine getauscht: B-Juniorinnen Montag 18:30–20:00 Uhr auf KR1; C1 Mittwoch 17:00–18:30 Uhr auf KR2. B-Juniorinnen zusätzlich Mittwoch 20:00–21:00 Uhr in der Teggingerhalle. Dort bleibt Mittwoch 21:00–22:00 Uhr frei.'],
 ['<b>E2 / E3 · Mittwoch</b>','Mittwoch 17:00–18:00 Uhr: E2 in der Sonnenrainhalle, <b>Im Wechsel mit E3</b>; E3 in der Untersee-Gymnastikhalle, <b>Im Wechsel mit E2</b>. Beide Mannschaften nutzen zeitgleich je eine Halle und tauschen die Räume. Die Untersee-Zeit muss noch von der Stadt zugeteilt werden. Die erste Wechselreihenfolge ist offen.'],
 ['<b>C1 / C2</b>','Sonnenrainhalle Donnerstag 17:15–18:30 Uhr: C1 · <b>Im Wechsel mit C2</b>. Der Beginn der Wechselreihenfolge ist noch festzulegen.'],
 ['<b>A- und B-Junioren</b>','Für die A- und B-Junioren der SG ist kein Hallenplatz vorgesehen.'],
 ],[47,127]),Spacer(1,13),
 P('Zusätzliche Zeitfenster im städtischen Gesamtplan','section'),
 P('Diese zusätzlichen Zeiten sind nicht dem BSV zugeteilt. Im aktualisierten Plan ist dort keine Belegung eingetragen. Zuteilung und gegebenenfalls Schließzeit müssen bei der Stadt bestätigt werden.','body'),
 table(['Halle','Tag','Uhrzeit','Planstatus'],[
 ['Teggingerhalle','Dienstag','16:00–17:00','Zwischen Schulende und Ringen nicht belegt'],
 ['BSZ · beide Teile','Freitag','ab 21:00','Nach letzter eingetragener Belegung; Schließzeit klären'],
 ['Untersee-Gymnastikhalle','Montag','17:00–18:00','Zwischen Schulende und Boxen nicht belegt; Mittwoch für E2/E3 als Wunsch eingeplant'],
 ['Untersee-Gymnastikhalle','Donnerstag','19:00–20:00','Nach letzter eingetragener Belegung; Zuteilung und Öffnung klären'],
 ],[47,29,30,68]),Spacer(1,7),
 P('<b>Planungsgrenzen:</b> Nur Montag bis Freitag ab 15:00 Uhr; Optionen unter 45 Minuten sind ausgeschlossen. In beiden Gymnastikhallen enden alle Zeitfenster spätestens um 20:00 Uhr. Die BSZ-Option ab 21:00 Uhr setzt eine bestätigte Nutzungsdauer von mindestens 45 Minuten voraus. Teggingerhalle Mo/Do 20:00–22:00 durch FC Radolfzell belegt.','small'),Spacer(1,8),
 P('Weitere BSV-Mannschaften auf dem Kunstrasen','section'),
 table(['Mannschaft','Kunstrasen','Halle'],[
 ['<b>Frauen 1 und 2</b>','Mo 20:00–21:30 · KR1','Keine zugeteilt'],
 ['<b>Herren 1</b>','Di 20:00–21:30 · KR2<br/>Do 18:30–20:00 · KR2','Keine zugeteilt'],
 ['<b>Herren 2 / SGM-BSV</b>','Mi 20:00–21:30 · KR1','Keine zugeteilt'],
 ],[59,69,46]),Spacer(1,13),
 P('Grundlage und Gültigkeit','section'),
 P('Grundlage: die acht am 22.10.2026 bereitgestellten aktualisierten Hallenpläne Winter 2026/27 (gültig nach den Herbstferien) und die abgestimmte Mannschaftsplanung. Beide Gymnastikhallen sind bis spätestens 20:00 Uhr einbezogen. Kunstrasen: bisher bestätigte BSV- und SG-Termine sowie die vereinbarten Tausche F2/F3 mit FC D1 und B-Juniorinnen mit C1.','small'),
 P('<b>Arbeitsstand auf dem Papier. Noch keine abschließende Gesamtzuteilung oder verbindliche Veröffentlichung.</b>','small')]

def footer(c,doc):
    c.setStrokeColor(colors.HexColor('#dce5de'));c.line(18*mm,17*mm,192*mm,17*mm)
    c.setFont('Regular',7.2);c.setFillColor(muted)
    c.drawString(18*mm,12*mm,'BSV Nordstern · Arbeitsstand 22.10.2026 · Winter 2026/27')
    c.drawRightString(192*mm,12*mm,f'{doc.page}/3')
SimpleDocTemplate(str(OUTPUT),pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=15*mm,bottomMargin=23*mm,title='BSV Trainingsplan Winter 2026/27 – Stand 22.10.2026',author='BSV Nordstern – Planungsübersicht',subject='Vollständige Hallen- und Kunstrasenübersicht mit offenen Zuordnungen').build(story,onFirstPage=footer,onLaterPages=footer)
print(OUTPUT)
