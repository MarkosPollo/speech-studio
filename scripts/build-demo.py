"""Generate original, conceptual demo slides. Requires ReportLab."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit

OUT=Path(__file__).resolve().parents[1]/'web/demo/spacex-demo.pdf'
W,H=960,540
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=0,invariant=1)
c.setTitle('SpaceX: Reuse and complete-system testing')
c.setAuthor('Speech Studio')
c.setSubject('Independent educational demo with original conceptual diagrams')
navy=HexColor('#152c4b');blue=HexColor('#92d6f1');white=HexColor('#f5f8fc');muted=HexColor('#bacbdd')

def text(x,y,value,size=20,color=white,font='Helvetica'):
    c.setFillColor(color);c.setFont(font,size);c.drawString(x,y,value)
def lines(x,y,value,size=20,width=850,color=white):
    for line in simpleSplit(value,'Helvetica',size,width):
        text(x,y,line,size,color);y-=size*1.4
def base(n,title,kicker):
    c.setFillColor(navy);c.rect(0,0,W,H,fill=1,stroke=0)
    text(52,486,'SPEECH STUDIO / EDUCATIONAL DEMO',13,blue,'Helvetica-Bold')
    text(52,426,title,36,white,'Helvetica-Bold');text(52,390,kicker,18,muted)
    c.setStrokeColor(HexColor('#385472'));c.line(52,67,908,67)
    text(52,42,'Independent demo. No SpaceX or NASA affiliation. Diagrams are conceptual, not to scale.',11,muted)
    text(868,42,f'{n:02d} / 06',12,blue)
def box(x,y,w,h,label,detail=''):
    c.setFillColor(HexColor('#233e5c'));c.setStrokeColor(blue);c.roundRect(x,y,w,h,10,fill=1,stroke=1)
    text(x+18,y+h-34,label,19,white,'Helvetica-Bold')
    if detail:lines(x+18,y+h-64,detail,14,w-36,muted)
def arrow(x1,y1,x2,y2):
    import math
    c.setStrokeColor(blue);c.setLineWidth(2);c.line(x1,y1,x2,y2)
    a=math.atan2(y2-y1,x2-x1)
    for da in [-0.55,0.55]:c.line(x2,y2,x2-10*math.cos(a+da),y2-10*math.sin(a+da))

base(1,'What does it take to use something again?','SpaceX as a case study in reusable hardware and systems thinking')
box(52,180,258,125,'A clear question','Define what the audience needs to understand.')
arrow(324,242,349,242);box(365,180,258,125,'A simple model','Show the parts and how they relate.')
arrow(637,242,662,242);box(678,180,230,125,'Evidence','Separate facts from your interpretation.')
text(52,110,'Start with the idea. Add detail only when it helps.',22,blue);c.showPage()

base(2,'Two stages. Different jobs.','Falcon 9 divides the work of a launch between two stages.')
box(52,219,205,104,'Launch','Both stages begin the mission together.')
arrow(276,271,355,313);arrow(276,271,355,186)
box(380,272,528,92,'First-stage recovery','Recovered hardware can be prepared for another flight.')
box(380,139,528,92,'Second stage continues','The payload continues toward its required orbit.')
text(52,94,'Recovery is mission-dependent and is not guaranteed.',16,muted);c.showPage()

base(3,'Recovery is part of a larger cycle.','A conceptual model of reuse, not an internal company checklist.')
for x,y,label in [(120,263,'1. Fly'),(550,263,'2. Recover'),(550,127,'3. Inspect'),(120,127,'4. Prepare')]:box(x,y,285,88,label)
arrow(422,307,534,307);arrow(692,251,692,230);arrow(534,170,422,170);arrow(262,230,262,251)
text(120,97,'Ask what changed, what is known, and what still needs checking.',16,muted);c.showPage()

base(4,'Demo-2: test the whole journey.','May 30, 2020 / Robert Behnken and Douglas Hurley / Crew Dragon')
for i,label in enumerate(['Launch','In-orbit','Docking','Landing']):
    x=52+i*220;box(x,207,196,115,label,'One part of the end-to-end system test.')
    if i<3:arrow(x+201,263,x+216,263)
lines(52,126,'NASA described Demo-2 as an end-to-end crew transportation test.',21,850,blue);c.showPage()

base(5,'Explain the relationship, not every detail.','Three presentation lessons from the case study')
for n,y,title,detail in [(1,289,'State the question','What does the audience need to understand?'),(2,211,'Show the handoff','How do the parts work together?'),(3,133,'Separate facts and interpretation','Which claims have evidence, and which are your teaching model?')]:
    text(52,y,str(n),34,blue,'Helvetica-Bold');text(102,y+7,title,23,white,'Helvetica-Bold');text(102,y-24,detail,17,muted)
c.showPage()

base(6,'Your next explanation','Choose a system in your own work. Make its logic easier to follow.')
box(52,228,258,116,'Parts','Name the pieces that matter.')
box(365,228,258,116,'Handoffs','Show how the work moves.')
box(678,228,230,116,'Evidence','Say what is known and assumed.')
text(52,170,'Primary sources',16,blue,'Helvetica-Bold')
text(52,142,'NASA: Launch Services Program rockets (Falcon 9)',17,white)
text(52,114,'NASA: Demo-2 launch release, May 30, 2020',17,white)
text(52,87,'Full source links and accessible slide descriptions: demo/sources.html',13,muted)
c.linkURL('https://www.nasa.gov/launch-services-program-rockets/',(52,134,530,158),relative=0)
c.linkURL('https://www.nasa.gov/news-release/nasa-astronauts-launch-from-america-in-historic-test-flight-of-spacex-crew-dragon/',(52,105,620,132),relative=0)
c.showPage();c.save()
print(OUT.name)
