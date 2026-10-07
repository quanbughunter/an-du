from PIL import Image, ImageDraw
import math, pathlib
OUT = pathlib.Path(__file__).parent
BG = (245, 244, 255, 255)
SEG = [((91,149,245),0.45),((155,116,242),0.27),((239,184,35),0.18),((34,179,154),0.10)]
GREEN = (31,164,99,255)
def art(size, scale=1.0, bg=True, rounded=True):
    S = size*4
    im = Image.new('RGBA', (S,S), (0,0,0,0))
    d = ImageDraw.Draw(im)
    if bg:
        if rounded: d.rounded_rectangle([0,0,S-1,S-1], radius=int(S*0.22), fill=BG)
        else: d.rectangle([0,0,S,S], fill=BG)
    c = S/2
    def R(f): return f*S*scale
    # rim arc (green, ~300deg)
    rr, w = R(0.40), R(0.06)
    box=[c-rr,c-rr,c+rr,c+rr]
    d.arc(box, start=-90, end=-90+300, fill=GREEN, width=int(w))
    for ang in (-90, -90+300):
        a=math.radians(ang); x=c+(rr-w/2)*math.cos(a); y=c+(rr-w/2)*math.sin(a)
        d.ellipse([x-w/2,y-w/2,x+w/2,y+w/2], fill=GREEN)
    # white dish
    rd = R(0.315); d.ellipse([c-rd,c-rd,c+rd,c+rd], fill=(255,255,255,255))
    # macro ring
    ro, ri = R(0.27), R(0.165)
    start=-90
    for col,frac in SEG:
        end=start+360*frac
        d.pieslice([c-ro,c-ro,c+ro,c+ro], start=start+1.2, end=end-1.2, fill=col+(255,))
        start=end
    d.ellipse([c-ri,c-ri,c+ri,c+ri], fill=(255,255,255,255))
    return im.resize((size,size), Image.LANCZOS)
ic = OUT/'icons'; ic.mkdir(exist_ok=True)
art(192).save(ic/'icon-192.png'); art(512).save(ic/'icon-512.png')
art(512, scale=0.82, rounded=False).save(ic/'maskable-512.png')
art(180, rounded=False).save(ic/'apple-touch-icon.png')
res = OUT/'android-res'
for name, px in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    d = res/f'mipmap-{name}'; d.mkdir(parents=True, exist_ok=True)
    art(px).save(d/'ic_launcher.png')
    fg = px*108//48
    art(fg, scale=66/108*0.98, bg=False).save(d/'ic_launcher_fg.png')
art(512).save(OUT/'icon-preview.png')
print('ok')
