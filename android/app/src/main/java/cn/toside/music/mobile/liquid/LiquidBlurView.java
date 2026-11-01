package cn.toside.music.mobile.liquid;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;

/**
 * 液态玻璃用的原生背景模糊视图。
 *
 * 为什么不用 @react-native-community/blur（Dimezis BlurView）：
 *
 * 该库的 PreDrawBlurController 在构造时把 SizeScaler 的缩放因子硬编码成 6.0f
 * （字节码：`ldc float 6.0f`），而 react-native 封装层的 downsampleFactor
 * 落到原生是**空方法** —— BlurViewManagerImpl.setDownsampleFactor() 方法体为 `{}`。
 * 也就是说 JS 侧传任何降采样参数都无效，永远是 6 倍。
 *
 * 后果可以精确算出来：dock 高度 122px ÷6 = 20px 位图，再套半径 10 的模糊，
 * 屏幕上的等效模糊半径 = 10 × 6 = 60px。而一行中文的行高只有 38px ——
 * 用 60px 的核去糊 38px 的字，纹理必然被平均成色带，
 * 玻璃后面看起来「什么都看不到」。这就是反复调叠层、调白雾都救不回来的原因。
 *
 * 本实现要点：
 * 1. 降采样倍率可调（默认 2），等效模糊半径落在 12~16px 这个「保留轮廓」区间；
 * 2. 三遍 box blur 近似高斯（可分离，先横后竖），纯 Java 实现，
 *    不依赖已废弃的 RenderScript，也不受设备 GPU 驱动差异影响；
 * 3. 在**绘制前一帧**（OnPreDraw）捕获背景，滚动即刷新，不需要 autoUpdate 开关；
 * 4. 捕获时排除整块玻璃子树（含 scrim / 白雾 / 图标 / 文字），
 *    否则图标和文字会被一起糊进背景，在玻璃后面留一圈重影。
 */
public class LiquidBlurView extends View {

  private final Paint bitmapPaint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
  private final Rect dstRect = new Rect();

  /** 模糊源根容器（通常是 android.R.id.content）。 */
  private ViewGroup rootView;

  private Bitmap captureBitmap;   // 降采样后的原始背景
  private Bitmap blurBitmap;      // 模糊输出
  private int[] bufA;
  private int[] bufB;
  private Canvas captureCanvas;

  private int downsample = 2;
  /**
   * 目标模糊强度，单位是**屏幕空间**的标准差 sigma（px）。
   *
   * 用屏幕空间而不是降采样空间：调用方只该关心「糊到什么程度」，
   * 不该被降采样倍率牵连。换算在 recomputeBoxRadius() 里做。
   */
  private float screenSigma = 12f;
  /** 实际用于 box blur 的半径（降采样空间）。 */
  private int boxRadius = 6;
  private int overlayColor = 0;
  private boolean blurEnabled = true;
  // All instances share the UI thread. Exclude every glass surface while capturing.
  private static int captureDepth = 0;

  static boolean isCapturingBackground() {
    return captureDepth > 0;
  }

  private final int[] rootLocation = new int[2];
  private final int[] selfLocation = new int[2];

  private final ViewTreeObserver.OnPreDrawListener preDrawListener =
      new ViewTreeObserver.OnPreDrawListener() {
        @Override
        public boolean onPreDraw() {
          if (blurEnabled) captureBackground();
          return true;
        }
      };

  public LiquidBlurView(Context context) {
    super(context);
    setWillNotDraw(false);
  }

  public void setRootView(ViewGroup root) {
    this.rootView = root;
    invalidate();
  }

  public void setDownsample(int factor) {
    int next = Math.max(1, factor);
    if (this.downsample != next) {
      this.downsample = next;
      releaseBitmaps();
      recomputeBoxRadius();
      invalidate();
    }
  }

  public void setBlurRadius(float sigmaPx) {
    this.screenSigma = Math.max(0f, sigmaPx);
    recomputeBoxRadius();
    invalidate();
  }

  public void setOverlayColor(int color) {
    this.overlayColor = color;
    invalidate();
  }

  public void setBlurEnabled(boolean enabled) {
    if (this.blurEnabled == enabled) return;
    this.blurEnabled = enabled;
    if (!enabled) releaseBitmaps();
    invalidate();
  }

  /** 屏幕空间 sigma -> 降采样空间 box 半径。 */
  private void recomputeBoxRadius() {
    // 三遍 box blur 叠加后方差 ≈ (w²-1)/4（w = 2r+1），即 sigma ≈ r + 0.5
    // => r = sigma_screen / downsample - 0.5
    float sigmaDs = screenSigma / downsample;
    boxRadius = Math.max(1, Math.round(sigmaDs - 0.5f));
  }

  private void releaseBitmaps() {
    if (captureBitmap != null) {
      captureBitmap.recycle();
      captureBitmap = null;
    }
    if (blurBitmap != null) {
      blurBitmap.recycle();
      blurBitmap = null;
    }
    bufA = null;
    bufB = null;
    captureCanvas = null;
  }

  @Override
  protected void onAttachedToWindow() {
    super.onAttachedToWindow();
    getViewTreeObserver().addOnPreDrawListener(preDrawListener);
  }

  @Override
  protected void onDetachedFromWindow() {
    ViewTreeObserver observer = getViewTreeObserver();
    if (observer.isAlive()) observer.removeOnPreDrawListener(preDrawListener);
    releaseBitmaps();
    super.onDetachedFromWindow();
  }

  @Override
  protected void onSizeChanged(int w, int h, int oldw, int oldh) {
    super.onSizeChanged(w, h, oldw, oldh);
    releaseBitmaps();
  }

  @Override
  public void draw(Canvas canvas) {
    // 捕获阶段会重新遍历整棵树，此时不能再画自己，否则无限递归
    if (isCapturingBackground()) return;

    if (blurEnabled && blurBitmap != null && !blurBitmap.isRecycled()) {
      dstRect.set(0, 0, getWidth(), getHeight());
      canvas.drawBitmap(blurBitmap, null, dstRect, bitmapPaint);
    }
    if (overlayColor != 0) canvas.drawColor(overlayColor);
    super.draw(canvas);
  }

  /** 在绘制前捕获背景并模糊。 */
  private void captureBackground() {
    final int w = getWidth();
    final int h = getHeight();
    if (w <= 0 || h <= 0 || rootView == null) return;

    final int bw = Math.max(1, w / downsample);
    final int bh = Math.max(1, h / downsample);

    if (captureBitmap == null || captureBitmap.getWidth() != bw || captureBitmap.getHeight() != bh) {
      releaseBitmaps();
      try {
        captureBitmap = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888);
        blurBitmap = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888);
      } catch (OutOfMemoryError e) {
        releaseBitmaps();
        return;
      }
      bufA = new int[bw * bh];
      bufB = new int[bw * bh];
      captureCanvas = new Canvas(captureBitmap);
    }

    captureBitmap.eraseColor(0);
    getLocationInWindow(selfLocation);
    rootView.getLocationInWindow(rootLocation);

    // The native surface skips its complete subtree during captures without
    // changing alpha/visibility, which would invalidate the next frame.
    captureDepth++;
    final int save = captureCanvas.save();
    try {
      captureCanvas.scale((float) bw / w, (float) bh / h);
      captureCanvas.translate(
          rootLocation[0] - selfLocation[0],
          rootLocation[1] - selfLocation[1]);
      // 只栅格化「玻璃所在的那块矩形」。rootView.draw() 会遍历整棵树，
      // 但有了 clip 之后，clip 之外的分支不会真正往下画 ——
      // 这是把「每帧多画一遍全屏」压到「每帧多画一块浮层」的关键，
      // 不加的话 CPU 会明显偏高。
      captureCanvas.clipRect(selfLocation[0] - rootLocation[0], selfLocation[1] - rootLocation[1],
          selfLocation[0] - rootLocation[0] + w, selfLocation[1] - rootLocation[1] + h);
      rootView.draw(captureCanvas);
    } finally {
      captureCanvas.restoreToCount(save);
      captureDepth--;
    }

    captureBitmap.getPixels(bufA, 0, bw, 0, 0, bw, bh);

    // 三遍 box blur 近似高斯
    final int r = Math.max(1, boxRadius);
    blurPass(bufA, bufB, bw, bh, r);
    blurPass(bufB, bufA, bw, bh, r);
    blurPass(bufA, bufB, bw, bh, r);

    blurBitmap.setPixels(bufB, 0, bw, 0, 0, bw, bh);
  }

  /**
   * 一次可分离的 box blur：结果最终落在 dst。
   *
   * 中途把纵向那一趟写到 src、再搬回 dst，是为了避免「读写同一数组」——
   * 滑动窗口如果一边读一边覆写，后半段读到的是已经被模糊过的像素，
   * 结果会随位置逐渐偏移（表现为拖影），不是真正的高斯。
   * 调用方需保证 src 的内容在本次调用后可被覆盖。
   */
  private static void blurPass(int[] src, int[] dst, int w, int h, int r) {
    blurHorizontal(src, dst, w, h, r);   // src -> dst
    blurVertical(dst, src, w, h, r);     // dst -> src（不复用同一数组）
    System.arraycopy(src, 0, dst, 0, dst.length);
  }

  private static void blurHorizontal(int[] src, int[] dst, int w, int h, int r) {
    final int div = r * 2 + 1;
    for (int y = 0; y < h; y++) {
      final int row = y * w;
      int a = 0, rr = 0, gg = 0, bb = 0;
      for (int i = -r; i <= r; i++) {
        final int c = src[row + clamp(i, w)];
        a += c >>> 24;
        rr += (c >> 16) & 0xFF;
        gg += (c >> 8) & 0xFF;
        bb += c & 0xFF;
      }
      for (int x = 0; x < w; x++) {
        dst[row + x] = ((a / div) << 24) | ((rr / div) << 16) | ((gg / div) << 8) | (bb / div);
        final int out = src[row + clamp(x - r, w)];
        final int in = src[row + clamp(x + r + 1, w)];
        a += (in >>> 24) - (out >>> 24);
        rr += ((in >> 16) & 0xFF) - ((out >> 16) & 0xFF);
        gg += ((in >> 8) & 0xFF) - ((out >> 8) & 0xFF);
        bb += (in & 0xFF) - (out & 0xFF);
      }
    }
  }

  private static void blurVertical(int[] src, int[] dst, int w, int h, int r) {
    final int div = r * 2 + 1;
    for (int x = 0; x < w; x++) {
      int a = 0, rr = 0, gg = 0, bb = 0;
      for (int i = -r; i <= r; i++) {
        final int c = src[clamp(i, h) * w + x];
        a += c >>> 24;
        rr += (c >> 16) & 0xFF;
        gg += (c >> 8) & 0xFF;
        bb += c & 0xFF;
      }
      for (int y = 0; y < h; y++) {
        dst[y * w + x] = ((a / div) << 24) | ((rr / div) << 16) | ((gg / div) << 8) | (bb / div);
        final int out = src[clamp(y - r, h) * w + x];
        final int in = src[clamp(y + r + 1, h) * w + x];
        a += (in >>> 24) - (out >>> 24);
        rr += ((in >> 16) & 0xFF) - ((out >> 16) & 0xFF);
        gg += ((in >> 8) & 0xFF) - ((out >> 8) & 0xFF);
        bb += (in & 0xFF) - (out & 0xFF);
      }
    }
  }

  private static int clamp(int v, int size) {
    return v < 0 ? 0 : (v >= size ? size - 1 : v);
  }
}