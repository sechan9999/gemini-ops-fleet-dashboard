from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
files = sorted(Path('/home/ubuntu/screenshots').glob('webdev-preview-root-*.png'), key=lambda p: p.stat().st_mtime, reverse=True)[:12]
thumbs=[]
for p in files:
    im=Image.open(p).convert('RGB')
    im.thumbnail((320,180))
    canvas=Image.new('RGB',(340,220),'white')
    canvas.paste(im,((340-im.width)//2,8))
    ImageDraw.Draw(canvas).text((8,190),p.name,fill='black')
    thumbs.append(canvas)
out=Image.new('RGB',(1020,880),'#e8e7df')
for i,im in enumerate(thumbs): out.paste(im,((i%3)*340,(i//3)*220))
out.save('/home/ubuntu/gemini-ops-fleet-dashboard/docs/video-contact-sheet.jpg',quality=90)
