"""Generate a 1280x640 GitHub social-preview card from the Anno branding."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

ASSETS = r'W:\WORK\ANNO\customTools\anno_dds_packer_tauri\webui\assets'
OUTDIR = r'W:\WORK\ANNO\customTools\anno_dds_packer_tauri\docs'
os.makedirs(OUTDIR, exist_ok=True)

W, H = 1280, 640
GOLD    = (201, 161, 82)
GOLD_HI = (224, 192, 122)
CREAM   = (213, 198, 168)
NAVY_TOP = (12, 26, 42)
NAVY_BOT = (6, 14, 24)

# --- background: vertical navy gradient ---
bg = Image.new('RGB', (W, H), NAVY_BOT)
top = Image.new('RGB', (W, H), NAVY_TOP)
mask = Image.new('L', (W, H))
md = mask.load()
for y in range(H):
    v = int(255 * (1 - y / H) ** 1.3)
    for x in range(W):
        md[x, y] = v
bg = Image.composite(top, bg, mask)

# subtle radial glow behind the logo (left third)
glow = Image.new('L', (W, H), 0)
ImageDraw.Draw(glow).ellipse([-120, 120, 620, 620], fill=70)
glow = glow.filter(ImageFilter.GaussianBlur(120))
glow_col = Image.new('RGB', (W, H), (40, 64, 96))
bg = Image.composite(glow_col, bg, glow)

card = bg.convert('RGBA')

# --- inset gold frame (thin double hairline) ---
def frame(c, inset, w, col, alpha):
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [inset, inset, W - 1 - inset, H - 1 - inset],
        radius=14, outline=col + (alpha,), width=w)
    return Image.alpha_composite(c, layer)

card = frame(card, 26, 2, GOLD, 200)
card = frame(card, 34, 1, GOLD, 90)
draw = ImageDraw.Draw(card)

# --- gold A logo, left side ---
logo = Image.open(os.path.join(ASSETS, 'anno_hero_logo.png')).convert('RGBA')
target_h = 280
scale = target_h / logo.height
logo = logo.resize((int(logo.width * scale), target_h), Image.LANCZOS)
lx = 110
ly = (H - logo.height) // 2 - 10
card.alpha_composite(logo, (lx, ly))

# --- text, right of logo ---
GB = r'C:\WINDOWS\Fonts\georgiab.ttf'
G = r'C:\WINDOWS\Fonts\georgia.ttf'

tx = lx + logo.width + 64
right_margin = 70
avail = W - tx - right_margin

TRACK = 8

def line_width(d, text, fnt, tracking=TRACK):
    return sum(d.textlength(ch, font=fnt) + tracking for ch in text) - tracking

def draw_tracked(d, xy, text, fnt, fill, tracking=TRACK):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill)
        x += d.textlength(ch, font=fnt) + tracking
    return x

# auto-fit the title so the longest line ('DDS PACKER') fills but never overflows
lines = ['ANNO', 'DDS PACKER']
size = 96
while size > 40:
    title_f = ImageFont.truetype(GB, size)
    if max(line_width(draw, ln, title_f) for ln in lines) <= avail:
        break
    size -= 2
title_f = ImageFont.truetype(GB, size)
line_gap = int(size * 1.12)

# vertically center the whole text block (2 title lines + rule + subtitle)
sub_f = ImageFont.truetype(G, max(26, int(size * 0.36)))
block_h = line_gap + size + 60 + sub_f.size
ty = (H - block_h) // 2 + 6

draw_tracked(draw, (tx, ty), lines[0], title_f, GOLD_HI)
draw_tracked(draw, (tx, ty + line_gap), lines[1], title_f, GOLD_HI)

rule_y = ty + line_gap + size + 24
rule_w = min(avail, int(line_width(draw, lines[1], title_f)))
draw.line([tx + 2, rule_y, tx + rule_w, rule_y], fill=GOLD + (160,), width=2)
draw.text((tx + 2, rule_y + 18), 'BC7 Texture Converter  ·  Anno 117 & 1800',
          font=sub_f, fill=CREAM)

card = card.convert('RGB')
out = os.path.join(OUTDIR, 'social_preview.png')
card.save(out, optimize=True)
print('Saved:', out, card.size, f'{os.path.getsize(out)/1024:.0f} KB')
