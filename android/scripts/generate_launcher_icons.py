#!/usr/bin/env python3
"""Generate Android launcher icons from the repository's official Matthew logo."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/images/brand/logo-matthew.png"
RES = ROOT / "android/app/src/main/res"
if not SOURCE.is_file():
    raise SystemExit(f"Official Matthew logo not found: {SOURCE}")

logo = Image.open(SOURCE).convert("RGBA")
# Keep the full mark visible and centered; use the site's navy brand background.
def fit_mark(size, padding=0.16):
    box = int(size * (1 - 2 * padding))
    mark = ImageOps.contain(logo, (box, box), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (7, 21, 46, 255))
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas

for density, size in {
    "mdpi": 48, "hdpi": 72, "xhdpi": 96,
    "xxhdpi": 144, "xxxhdpi": 192,
}.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = fit_mark(size)
    icon.save(folder / "ic_launcher.png", optimize=True)
    icon.save(folder / "ic_launcher_round.png", optimize=True)

# Adaptive icon foreground: transparent outside the Android safe zone.
foreground = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
mark = ImageOps.contain(logo, (300, 300), Image.Resampling.LANCZOS)
foreground.alpha_composite(mark, ((432 - mark.width) // 2, (432 - mark.height) // 2))
anydpi = RES / "mipmap-anydpi-v26"
anydpi.mkdir(parents=True, exist_ok=True)
foreground.save(anydpi / "ic_launcher_foreground.png", optimize=True)
(anydpi / "ic_launcher.xml").write_text("\\n".join([
    '<?xml version="1.0" encoding="utf-8"?>',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
    '    <background android:drawable="@color/ic_launcher_background" />',
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />',
    '</adaptive-icon>',
    ''
]), encoding="utf-8")
values = RES / "values"
values.mkdir(parents=True, exist_ok=True)
colors = values / "colors.xml"
content = colors.read_text(encoding="utf-8") if colors.exists() else "\\n".join(['<?xml version="1.0" encoding="utf-8"?>', '<resources>', '</resources>', ''])
if "</resources>" not in content:
    raise SystemExit("Invalid colors.xml")
if "ic_launcher_background" not in content:
    content = content.replace("</resources>", "\\n".join(['    <color name="ic_launcher_background">#07152E</color>', '</resources>']))
colors.write_text(content, encoding="utf-8")
print(f"Generated launcher icons from {SOURCE}")
