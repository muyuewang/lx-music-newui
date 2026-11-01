"""生成液态玻璃主题的背景图（对齐参考图的深蓝紫夜空）。

色值直接从参考截图采样得到：
  顶部   rgb(28, 56, 104)
  上段   rgb(14, 46, 93)   最深，接近「夜空」
  中部   rgb(68, 73, 129)  最亮，是那团弥散辉光的中心
  底部   rgb(32, 49, 95)   回落，右下带紫调 rgb(111, 102, 155)
所以色带不是单调渐变，而是「暗 - 亮 - 暗」的三段结构，
单纯线性渐变会做不出中间那层光。
"""
import os
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1920
OUT = os.path.join('src', 'theme', 'themes', 'images', 'liquid_glass.jpg')

# 三段式垂直色带，数值取自参考图左边缘空白区的纵向采样
STOPS = [
    (0.00, (30, 58, 106)),
    (0.12, (15, 47, 94)),
    (0.28, (30, 57, 107)),
    (0.45, (54, 69, 122)),
    (0.60, (68, 73, 129)),
    (0.75, (58, 67, 123)),
    (0.88, (44, 57, 110)),
    (1.00, (30, 48, 96)),
]


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient_row(t):
    for idx in range(len(STOPS) - 1):
        p0, c0 = STOPS[idx]
        p1, c1 = STOPS[idx + 1]
        if p0 <= t <= p1:
            local = 0 if p1 == p0 else (t - p0) / (p1 - p0)
            return lerp(c0, c1, local)
    return STOPS[-1][1]


base = Image.new('RGB', (W, H))
draw = ImageDraw.Draw(base)
for y in range(H):
    draw.line([(0, y), (W, y)], fill=gradient_row(y / (H - 1)))

# 光斑：参考图是夜空里几团弥散辉光，不是清晰圆斑。
# 中部偏右那团偏紫（底部采样到 rgb(111,102,155)），左上是冷白。
BLOBS = [
    (0.72, 0.10, 0.62, (150, 176, 232), 0.34),   # 右上冷蓝，压住顶部的死黑
    (0.18, 0.20, 0.54, (128, 158, 220), 0.26),   # 左上弱冷光
    (0.62, 0.46, 0.62, (196, 176, 240), 0.30),   # 中部偏右紫，全局最亮的核心
    (0.20, 0.52, 0.50, (150, 170, 226), 0.22),   # 左中蓝
    (0.86, 0.70, 0.52, (176, 148, 224), 0.30),   # 右下紫，对应采样里的紫调
    (0.34, 0.84, 0.56, (120, 148, 210), 0.20),   # 左下蓝，托住底部不让它死黑
    (0.60, 0.96, 0.44, (150, 132, 212), 0.20),   # 最底紫
]

glow = Image.new('RGB', (W, H), (0, 0, 0))
gdraw = ImageDraw.Draw(glow)
for cx, cy, r, color, alpha in BLOBS:
    radius = r * W
    x, y = cx * W, cy * H
    steps = 48
    for i in range(steps, 0, -1):
        ratio = i / steps
        rr = radius * ratio
        # 1.9 次幂衰减：参考图的光斑边界极其柔和，没有可见轮廓
        strength = alpha * (1 - ratio) ** 1.9
        c = tuple(int(v * strength) for v in color)
        gdraw.ellipse([x - rr, y - rr * 1.15, x + rr, y + rr * 1.15], fill=c)

glow = glow.filter(ImageFilter.GaussianBlur(radius=140))

# 加色混合：只提亮不改色相，避免出现灰蒙的过渡带
out = Image.new('RGB', (W, H))
bp = base.load()
gp = glow.load()
op = out.load()
for y in range(H):
    for x in range(W):
        b = bp[x, y]
        g = gp[x, y]
        op[x, y] = (
            min(255, b[0] + g[0]),
            min(255, b[1] + g[1]),
            min(255, b[2] + g[2]),
        )

out = out.filter(ImageFilter.GaussianBlur(radius=6))
out.save(OUT, 'JPEG', quality=88, optimize=True, progressive=True)
print('saved', OUT, os.path.getsize(OUT) // 1024, 'KB')