#!/usr/bin/env python3
"""Generates an animated showcase GIF carousel of the OPENFIT mobile app screenshots.
Renders an iPhone device frame with rounded screen corners, dynamic island,
animated pagination dots, and the screen title and subtitle labels below.

Run with:
    uv run --with pillow python3 tools/make_carousel_gif.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

CANVAS_W = 420
CANVAS_H = 808

SCREEN_W = 320
SCREEN_H = 692

PHONE_X = (CANVAS_W - SCREEN_W) // 2
PHONE_Y = 18

BEZEL_PAD = 6
OUTER_X0 = PHONE_X - BEZEL_PAD
OUTER_Y0 = PHONE_Y - BEZEL_PAD
OUTER_X1 = PHONE_X + SCREEN_W + BEZEL_PAD
OUTER_Y1 = PHONE_Y + SCREEN_H + BEZEL_PAD

# Fonts
FONT_BOLD_PATH = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
FONT_REG_PATH = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"

try:
    font_title = ImageFont.truetype(FONT_BOLD_PATH, 18)
    font_sub = ImageFont.truetype(FONT_REG_PATH, 13)
except Exception:
    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()

# Theme colors (matching OPENFIT dark theme & GitHub card)
BG_COLOR = (13, 17, 23)           # GitHub dark background #0d1117
CARD_BORDER = (33, 38, 45)         # Card border #21262d
BEZEL_FILL = (22, 26, 34)          # Phone bezel #161a22
BEZEL_BORDER = (51, 65, 85)        # Slate-700 outline #334155
LIME_ACCENT = (163, 230, 53)       # Brand lime green #a3e635
WHITE_TEXT = (248, 250, 252)       # Slate-50 #f8fafc
MUTED_TEXT = (148, 163, 184)       # Slate-400 #94a3b8
DOT_INACTIVE = (51, 65, 85)        # Slate-700
NOTCH_COLOR = (12, 14, 18)

SCREENS_INFO = [
    ("assets/screenshots/home.png", "Home", "Today's session & weight trend"),
    ("assets/screenshots/workout.png", "Workout", "Animated guidance & targets"),
    ("assets/screenshots/nutrition.png", "My Meals", "Food diary & macros"),
    ("assets/screenshots/stats.png", "My Stats", "Activity heatmap & muscle balance"),
    ("assets/screenshots/plan.png", "My Plan", "Weekly schedule & routines"),
    ("assets/screenshots/library.png", "Exercises", "1,300+ animated exercises"),
]

TOTAL_SCREENS = len(SCREENS_INFO)

# Dot track geometry
DOT_SIZE = 6
DOT_RADIUS = DOT_SIZE // 2
ACTIVE_W = 20
DOT_SPACING = 18
DOT_Y = 732

# Centers for 6 dots
DOT_CENTERS = [CANVAS_W // 2 + (i - (TOTAL_SCREENS - 1) / 2) * DOT_SPACING for i in range(TOTAL_SCREENS)]

def draw_dots(draw, curr_idx, next_idx, progress):
    # Inactive dots
    for c in DOT_CENTERS:
        draw.ellipse([c - DOT_RADIUS, DOT_Y - DOT_RADIUS, c + DOT_RADIUS, DOT_Y + DOT_RADIUS], fill=DOT_INACTIVE)
    
    # Active gliding pill
    if progress == 0:
        center_x = DOT_CENTERS[curr_idx]
    else:
        c_from = DOT_CENTERS[curr_idx]
        c_to = DOT_CENTERS[next_idx]
        center_x = c_from + progress * (c_to - c_from)
        
    pill_left = center_x - ACTIVE_W // 2
    pill_right = center_x + ACTIVE_W // 2
    draw.rounded_rectangle(
        [pill_left, DOT_Y - DOT_RADIUS, pill_right, DOT_Y + DOT_RADIUS],
        radius=DOT_RADIUS,
        fill=LIME_ACCENT
    )

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(repo_root)
    
    print("Loading and preparing high-resolution screenshot assets...")
    screens = []
    for rel_path, title, sub in SCREENS_INFO:
        full_path = os.path.join(repo_root, rel_path)
        if not os.path.exists(full_path):
            print(f"Error: Screenshot not found: {full_path}", file=sys.stderr)
            sys.exit(1)
        raw = Image.open(full_path).convert("RGBA")
        resized = raw.resize((SCREEN_W, SCREEN_H), Image.LANCZOS)
        screens.append((resized, title, sub))
        
    # Screen mask with rounded corners
    screen_mask = Image.new("L", (SCREEN_W, SCREEN_H), 0)
    mask_draw = ImageDraw.Draw(screen_mask)
    mask_draw.rounded_rectangle([0, 0, SCREEN_W, SCREEN_H], radius=22, fill=255)
    
    # Dynamic Island notch
    notch_w = 72
    notch_h = 18
    notch_x = (SCREEN_W - notch_w) // 2
    
    def render_frame(curr_idx, next_idx, progress):
        im = Image.new("RGB", (CANVAS_W, CANVAS_H), BG_COLOR)
        draw = ImageDraw.Draw(im)
        
        # Outer device bezel
        draw.rounded_rectangle(
            [OUTER_X0, OUTER_Y0, OUTER_X1, OUTER_Y1],
            radius=28,
            fill=BEZEL_FILL,
            outline=BEZEL_BORDER,
            width=1
        )
        
        # Phone screen buffer
        screen_buf = Image.new("RGBA", (SCREEN_W, SCREEN_H), (0, 0, 0, 255))
        curr_screen, curr_title, curr_sub = screens[curr_idx]
        next_screen, next_title, next_sub = screens[next_idx]
        
        # Cubic easing: p^2 * (3 - 2p)
        p = progress
        ease = 3 * (p ** 2) - 2 * (p ** 3)
        offset = int(ease * SCREEN_W)
        
        if progress == 0:
            screen_buf.paste(curr_screen, (0, 0))
        else:
            screen_buf.paste(curr_screen, (-offset, 0))
            screen_buf.paste(next_screen, (SCREEN_W - offset, 0))
            
        # Draw Dynamic Island over the screen
        notch_draw = ImageDraw.Draw(screen_buf)
        notch_draw.rounded_rectangle(
            [notch_x, 8, notch_x + notch_w, 8 + notch_h],
            radius=9,
            fill=NOTCH_COLOR
        )
        # Subtle camera lens reflection
        notch_draw.ellipse([notch_x + 52, 14, notch_x + 58, 20], fill=(25, 30, 40))
        
        # Paste masked screen into phone frame
        im.paste(screen_buf, (PHONE_X, PHONE_Y), screen_mask)
        
        # Draw pagination dots
        draw_dots(draw, curr_idx, next_idx, ease)
        
        # Label strip (width = CANVAS_W - 24, height = 54) to clip sliding labels cleanly
        strip_w = CANVAS_W - 24
        strip_h = 54
        label_strip = Image.new("RGB", (strip_w, strip_h), BG_COLOR)
        ldraw = ImageDraw.Draw(label_strip)
        
        strip_center_x = strip_w // 2
        label_offset = int(ease * strip_w)
        
        # Current label
        tb_curr = ldraw.textbbox((0, 0), curr_title, font=font_title)
        tw_curr = tb_curr[2] - tb_curr[0]
        sb_curr = ldraw.textbbox((0, 0), curr_sub, font=font_sub)
        sw_curr = sb_curr[2] - sb_curr[0]
        
        curr_tx = strip_center_x - tw_curr // 2 - label_offset
        curr_sx = strip_center_x - sw_curr // 2 - label_offset
        
        ldraw.text((curr_tx, 4), curr_title, font=font_title, fill=WHITE_TEXT)
        ldraw.text((curr_sx, 28), curr_sub, font=font_sub, fill=MUTED_TEXT)
        
        if progress > 0:
            tb_next = ldraw.textbbox((0, 0), next_title, font=font_title)
            tw_next = tb_next[2] - tb_next[0]
            sb_next = ldraw.textbbox((0, 0), next_sub, font=font_sub)
            sw_next = sb_next[2] - sb_next[0]
            
            next_tx = strip_center_x - tw_next // 2 + strip_w - label_offset
            next_sx = strip_center_x - sw_next // 2 + strip_w - label_offset
            
            ldraw.text((next_tx, 4), next_title, font=font_title, fill=WHITE_TEXT)
            ldraw.text((next_sx, 28), next_sub, font=font_sub, fill=MUTED_TEXT)
            
        im.paste(label_strip, (12, 746))
        
        # 1px subtle container border
        draw.rectangle([0, 0, CANVAS_W - 1, CANVAS_H - 1], outline=CARD_BORDER, width=1)
        
        return im

    print("Rendering carousel frames...")
    frames = []
    durations = []
    
    HOLD_MS = 2200          # 2.2s per screen
    TRANS_STEPS = 6         # 6 transition frames
    TRANS_STEP_MS = 50      # 50ms per transition frame (snappy 300ms total slide)
    
    for i in range(TOTAL_SCREENS):
        nxt = (i + 1) % TOTAL_SCREENS
        # Hold frame
        frames.append(render_frame(i, nxt, 0.0))
        durations.append(HOLD_MS)
        
        # Transition frames
        for f in range(1, TRANS_STEPS + 1):
            p = f / (TRANS_STEPS + 1)
            frames.append(render_frame(i, nxt, p))
            durations.append(TRANS_STEP_MS)
            
    print(f"Total animation frames: {len(frames)}")
    out_dir = os.path.join(repo_root, "assets", "screenshots")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "openfit-carousel.gif")
    
    print("Quantizing frames with adaptive 256-color palette...")
    palette_frames = [f.convert("P", palette=Image.ADAPTIVE, colors=256) for f in frames]
    
    print(f"Writing optimized animated GIF to {out_path}...")
    palette_frames[0].save(
        out_path,
        save_all=True,
        append_images=palette_frames[1:],
        duration=durations,
        loop=0,
        optimize=True
    )
    
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"✓ Successfully generated {out_path} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
