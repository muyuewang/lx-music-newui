package cn.toside.music.mobile.liquid;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.guichaguri.trackplayer.service.player.SpectrumAudioProcessor;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * 液态玻璃取色模块。
 *
 * 从专辑封面图片中提取主色，供玻璃面板的动态色调使用。
 * 之所以做成原生模块：RN 的 JS 侧没有图像解码 API，
 * 无法从远程 URL 拿到像素做色彩统计（Canvas/OffscreenCanvas 都不存在）。
 *
 * 实现要点：
 * - 先用 inSampleSize 把大图降采样到极小尺寸再解码，避免 OOM；
 * - 用 32 级量化分桶统计，取色桶内像素均值，兼顾稳定性与准确度；
 * - 按 URL 缓存结果，同一首歌不重复下载解码。
 */
public class LiquidModule extends ReactContextBaseJavaModule {
  private static final int QUANTIZE_BITS = 5;   // 每通道 32 级
  private static final int SAMPLE_SIZE = 24;    // 采样边长
  private static final int MAX_CACHE = 64;

  private final Map<String, int[]> cache = new HashMap<>();

  LiquidModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "LiquidModule";
  }

  /**
   * 读取当前频谱快照。
   *
   * resolve: [v0, v1, ... v15]，每个值 0~1；无音频信号时 resolve null。
   * JS 侧用定时器轮询（60fps 一次），比走事件推送更简单，
   * 且频谱本身是高频瞬时数据，轮询不会造成可感知延迟。
   *
   * 数据来源：track-player 库内的 SpectrumAudioProcessor
   * （挂在 ExoPlayer 音频链上做 FFT）。
   */
  @ReactMethod
  public void getSpectrum(Promise promise) {
    try {
      if (!SpectrumAudioProcessor.isEnabled() || !SpectrumAudioProcessor.hasSignal()) {
        promise.resolve(null);
        return;
      }
      float[] bands = SpectrumAudioProcessor.getBands();
      WritableArray arr = Arguments.createArray();
      for (float v : bands) {
        arr.pushDouble(Math.max(0f, Math.min(1f, v)));
      }
      promise.resolve(arr);
    } catch (Throwable t) {
      promise.resolve(null);
    }
  }

  /**
   * 开关频谱采集。
   * 关闭时完全停止 FFT 计算，省 CPU。
   */
  @ReactMethod
  public void setSpectrumEnabled(boolean enabled) {
    SpectrumAudioProcessor.setEnabled(enabled);
  }

  /** 取封面主色。
   *
   * @param url      封面图片地址（http/https 或本地 file://）
   * @param promise  resolve: [r, g, b] 三元组；失败 resolve null
   */
  @ReactMethod
  public void getDominantColor(String url, Promise promise) {
    if (url == null || url.isEmpty()) {
      promise.resolve(null);
      return;
    }

    int[] cached = cache.get(url);
    if (cached != null) {
      promise.resolve(toArray(cached));
      return;
    }

    new Thread(() -> {
      Bitmap bitmap = null;
      try {
        bitmap = downloadAndDecode(url);
        if (bitmap == null) {
          promise.resolve(null);
          return;
        }
        int[] dominant = pickDominant(bitmap);
        if (dominant == null) {
          promise.resolve(null);
          return;
        }
        synchronized (cache) {
          if (cache.size() >= MAX_CACHE) {
            String first = cache.keySet().iterator().next();
            cache.remove(first);
          }
          cache.put(url, dominant);
        }
        promise.resolve(toArray(dominant));
      } catch (Throwable t) {
        promise.resolve(null);
      } finally {
        if (bitmap != null) bitmap.recycle();
      }
    }).start();
  }

  /**
   * 一次性取一组颜色的主色（用于给玻璃面板提供高光色/阴影色）。
   * resolve: { dominant: [r,g,b], light: [r,g,b], dark: [r,g,b] }
   */
  @ReactMethod
  public void getColorPalette(String url, Promise promise) {
    if (url == null || url.isEmpty()) {
      promise.resolve(null);
      return;
    }
    new Thread(() -> {
      Bitmap bitmap = null;
      try {
        bitmap = downloadAndDecode(url);
        if (bitmap == null) {
          promise.resolve(null);
          return;
        }
        int[] dominant = pickDominant(bitmap);
        if (dominant == null) {
          promise.resolve(null);
          return;
        }
        WritableMap out = Arguments.createMap();
        out.putArray("dominant", toArray(dominant));
        out.putArray("light", toArray(shift(dominant, 0.72f, 0.28f)));
        out.putArray("dark", toArray(shift(dominant, 0.35f, 0f)));
        promise.resolve(out);
      } catch (Throwable t) {
        promise.resolve(null);
      } finally {
        if (bitmap != null) bitmap.recycle();
      }
    }).start();
  }

  /**
   * 下载并降采样解码。
   * 先用两次 decodeBounds 估算采样率，保证解码后的图足够小。
   */
  private Bitmap downloadAndDecode(String url) throws Exception {
    byte[] bytes = readAll(url);
    if (bytes == null || bytes.length == 0) return null;

    BitmapFactory.Options bounds = new BitmapFactory.Options();
    bounds.inJustDecodeBounds = true;
    BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);

    int sample = 1;
    int maxDim = Math.max(bounds.outWidth, bounds.outHeight);
    while (maxDim / sample > SAMPLE_SIZE * 2) {
      sample *= 2;
    }

    BitmapFactory.Options opts = new BitmapFactory.Options();
    opts.inSampleSize = sample;
    Bitmap decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, opts);
    if (decoded == null) return null;

    // 再精确缩到 SAMPLE_SIZE
    if (Math.abs(decoded.getWidth() - SAMPLE_SIZE) > 2 || Math.abs(decoded.getHeight() - SAMPLE_SIZE) > 2) {
      Bitmap scaled = Bitmap.createScaledBitmap(decoded, SAMPLE_SIZE, SAMPLE_SIZE, true);
      if (scaled != decoded) decoded.recycle();
      decoded = scaled;
    }
    return decoded;
  }

  private byte[] readAll(String url) throws Exception {
    HttpURLConnection conn = null;
    InputStream in = null;
    try {
      URL u = new URL(url);
      conn = (HttpURLConnection) u.openConnection();
      conn.setConnectTimeout(8000);
      conn.setReadTimeout(8000);
      conn.setInstanceFollowRedirects(true);
      conn.setRequestProperty("User-Agent", "Mozilla/5.0");
      in = conn.getInputStream();

      java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
      byte[] buf = new byte[8192];
      int len;
      while ((len = in.read(buf)) != -1) {
        bos.write(buf, 0, len);
        // 封面上限 4MB，防止异常大图
        if (bos.size() > 4 * 1024 * 1024) break;
      }
      return bos.toByteArray();
    } finally {
      if (in != null) try { in.close(); } catch (Throwable ignored) {}
      if (conn != null) conn.disconnect();
    }
  }

  /**
   * 量化分桶取主色。
   * 每通道按 32 级量化后统计频次，取最高频桶内像素的平均色。
   */
  private int[] pickDominant(Bitmap bitmap) {
    int w = bitmap.getWidth();
    int h = bitmap.getHeight();
    if (w <= 0 || h <= 0) return null;

    int[] pixels = new int[w * h];
    bitmap.getPixels(pixels, 0, w, 0, 0, w, h);

    Map<Integer, int[]> buckets = new HashMap<>();
    for (int p : pixels) {
      int a = Color.alpha(p);
      if (a < 128) continue;
      int r = Color.red(p);
      int g = Color.green(p);
      int b = Color.blue(p);

      // 极暗/极亮的像素对「色调」贡献意义不大，跳过以免主色被背景污染
      int lum = (r * 299 + g * 587 + b * 114) / 1000;
      if (lum < 12 || lum > 245) continue;

      int key = ((r >> QUANTIZE_BITS) << 10) | ((g >> QUANTIZE_BITS) << 5) | (b >> QUANTIZE_BITS);
      int[] agg = buckets.get(key);
      if (agg == null) {
        buckets.put(key, new int[]{1, r, g, b});
      } else {
        agg[0]++;
        agg[1] += r;
        agg[2] += g;
        agg[3] += b;
      }
    }

    if (buckets.isEmpty()) return null;

    int[] best = null;
    for (int[] agg : buckets.values()) {
      if (best == null || agg[0] > best[0]) best = agg;
    }
    if (best == null) return null;

    return new int[]{
      Math.round(best[1] / (float) best[0]),
      Math.round(best[2] / (float) best[0]),
      Math.round(best[3] / (float) best[0]),
    };
  }

  /** 在原色基础上调亮/调暗，生成派生色。 */
  private int[] shift(int[] base, float lightnessScale, float whiteMix) {
    int r = (int) Math.min(255, base[0] * lightnessScale + 255 * whiteMix);
    int g = (int) Math.min(255, base[1] * lightnessScale + 255 * whiteMix);
    int b = (int) Math.min(255, base[2] * lightnessScale + 255 * whiteMix);
    return new int[]{r, g, b};
  }

  private WritableArray toArray(int[] color) {
    WritableArray arr = Arguments.createArray();
    arr.pushInt(color[0]);
    arr.pushInt(color[1]);
    arr.pushInt(color[2]);
    return arr;
  }
}
