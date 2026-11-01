package com.guichaguri.trackplayer.service.player;

import androidx.media3.common.C;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.BaseAudioProcessor;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.ShortBuffer;

/**
 * 频谱分析音频处理器。
 *
 * 挂在 ExoPlayer 音频处理链上，拿到解码后的 PCM，
 * 做 FFT 得到各频段能量，供 UI 的进度条做「随频谱动态形变」。
 *
 * 为什么放在库里而不是 app 模块：
 * app 模块的类对库模块不可见（库先于 app 编译），
 * 而处理器必须注入到库内部的 AudioSink 构造流程里。
 *
 * 实现要点（按 media3 1.8 的 AudioProcessor API）：
 * - 继承 BaseAudioProcessor，在 onConfigure() 里协商输出格式；
 * - 本处理器是「透明」的：输出编码与输入编码保持一致，不做任何位深转换，
 *   这样下游的 SonicAudioProcessor / VolumeProcessor（media3 1.8 仅支持 16bit）
 *   不会因为收到 PCM_FLOAT 而抛 Unhandled input format、整条播放链崩溃；
 * - 在 queueInput 里读出样本做 FFT 分析（只更新频段能量，不修改数据），
 *   然后把输入字节原样透传给下游；
 * - 迭代式基-2 Cooley-Tukey FFT，1024 点约 10k 次蝶形运算，开销可忽略；
 * - 频段按对数划分（低频窄、高频宽），符合人耳感知。
 *
 * 线程模型：queueInput 在 ExoPlayer 的音频线程执行，
 * 结果写入 volatile 字段供 UI 线程读取，避免加锁。
 */
public class SpectrumAudioProcessor extends BaseAudioProcessor {
  public static final int FFT_SIZE = 1024;
  public static final int BAND_COUNT = 16;

  /** 每个频段的输出值（0~1），由音频线程写入、UI 线程读取。 */
  private static volatile float[] bands = new float[BAND_COUNT];

  /** 是否已收到有效音频数据。 */
  private static volatile boolean hasSignal = false;

  /** 是否启用采集（关闭时完全跳过分析，省 CPU）。 */
  private static volatile boolean enabled = false;

  private final float[] window = new float[FFT_SIZE];
  private int windowFill = 0;

  private final float[] fftReal = new float[FFT_SIZE];
  private final float[] fftImag = new float[FFT_SIZE];
  private final float[] magnitudes = new float[FFT_SIZE / 2];
  private final int[] bandEdges = new int[BAND_COUNT + 1];

  private int sampleRate = 44100;
  /** 协商后的输入编码（缓存，供 queueInput 使用；BaseAudioProcessor 的 inputFormat 字段在子类中不可直接访问）。 */
  private int inputEncoding = C.ENCODING_PCM_16BIT;
  /** 协商后的输入声道数。 */
  private int inputChannels = 2;

  /** 开关采集。 */
  public static void setEnabled(boolean value) {
    enabled = value;
    if (!value) clearBands();
  }

  public static boolean isEnabled() {
    return enabled;
  }

  /** 读取当前频段能量快照。 */
  public static float[] getBands() {
    return bands;
  }

  public static boolean hasSignal() {
    return hasSignal;
  }

  /** 清空频谱快照（切歌时调用，避免残留上一首的频谱）。 */
  private static void clearBands() {
    bands = new float[BAND_COUNT];
    hasSignal = false;
  }

  /**
   * 格式协商。
   *
   * 关键修复：输出格式必须与输入保持一致，禁止改成 PCM_FLOAT。
   * 之前这里在 16bit 输入时把输出声明成 float，导致下游
   * SonicAudioProcessor（media3 1.8 只支持 16bit）抛
   * Unhandled input format，整条播放链崩溃、播放页空白。
   *
   * 只处理 16bit 与 float PCM；其它格式直接拒绝，让链路上的
   * 其它处理器去处理，避免整条播放链因本处理器而失败。
   */
  @Override
  protected AudioFormat onConfigure(AudioFormat inputFormat)
          throws AudioProcessor.UnhandledAudioFormatException {
    if (inputFormat.encoding != C.ENCODING_PCM_FLOAT
            && inputFormat.encoding != C.ENCODING_PCM_16BIT
            && inputFormat.encoding != C.ENCODING_PCM_16BIT_BIG_ENDIAN) {
      throw new AudioProcessor.UnhandledAudioFormatException(inputFormat);
    }
    // 缓存输入编码与声道数，供 queueInput 使用（BaseAudioProcessor 的 inputFormat
    // 字段为 protected 且在子类的 queueInput 内无法直接引用）。
    inputEncoding = inputFormat.encoding;
    inputChannels = inputFormat.channelCount;
    if (inputFormat.sampleRate != 0) {
      sampleRate = inputFormat.sampleRate;
    }
    buildBandEdges();

    // 输出格式与输入完全一致 —— 本处理器对音频链路透明。
    return inputFormat;
  }

  /**
   * 按对数分布划分频段。
   * 线性分 bin 会让低频（鼓点、人声基频）挤在极少数 bin 里，
   * 视觉上几乎看不出变化；对数划分能让每个频段都有可观宽度。
   */
  private void buildBandEdges() {
    int half = FFT_SIZE / 2;
    double minFreq = 40;
    double maxFreq = Math.min(16000, sampleRate / 2.0);
    double ratio = Math.pow(maxFreq / minFreq, 1.0 / BAND_COUNT);

    for (int i = 0; i <= BAND_COUNT; i++) {
      double freq = minFreq * Math.pow(ratio, i);
      int bin = (int) Math.round(freq / (sampleRate / (double) FFT_SIZE));
      bandEdges[i] = Math.max(1, Math.min(half - 1, bin));
    }
    // 保证边界单调递增
    for (int i = 1; i <= BAND_COUNT; i++) {
      if (bandEdges[i] <= bandEdges[i - 1]) bandEdges[i] = bandEdges[i - 1] + 1;
    }
  }

  @Override
  public void queueInput(ByteBuffer inputBuffer) {
    int remaining = inputBuffer.remaining();
    if (remaining == 0) {
      return;
    }

    if (enabled) {
      // Analyze a view of the remaining PCM only; never rewind the decoder buffer.
      ByteOrder order = inputEncoding == C.ENCODING_PCM_16BIT_BIG_ENDIAN
          ? ByteOrder.BIG_ENDIAN : ByteOrder.nativeOrder();
      ByteBuffer analysisBuffer = inputBuffer.duplicate().order(order);
      int bytesPer = (inputEncoding == C.ENCODING_PCM_FLOAT) ? 4 : 2;
      int sampleCount = remaining / bytesPer;
      int step = Math.max(1, inputChannels);
      FloatBuffer floats = inputEncoding == C.ENCODING_PCM_FLOAT
          ? analysisBuffer.asFloatBuffer() : null;
      ShortBuffer shorts = floats == null ? analysisBuffer.asShortBuffer() : null;
      for (int i = 0; i < sampleCount; i += step) {
        window[windowFill++] = floats != null ? floats.get(i) : shorts.get(i) / 32768f;
        if (windowFill == FFT_SIZE) {
          analyze();
          System.arraycopy(window, FFT_SIZE / 2, window, 0, FFT_SIZE / 2);
          windowFill = FFT_SIZE / 2;
        }
      }
    }

    // Consume exactly [position, limit), then expose the written bytes for reading.
    ByteBuffer out = replaceOutputBuffer(remaining);
    out.put(inputBuffer);
    out.flip();
  }

  /** 执行一次 FFT 并更新频段能量。 */
  private void analyze() {
    // 汉宁窗，抑制频谱泄漏
    for (int i = 0; i < FFT_SIZE; i++) {
      double w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
      fftReal[i] = (float) (window[i] * w);
      fftImag[i] = 0f;
    }

    fft(fftReal, fftImag);

    for (int i = 0; i < FFT_SIZE / 2; i++) {
      float re = fftReal[i];
      float im = fftImag[i];
      magnitudes[i] = (float) Math.sqrt(re * re + im * im);
    }

    float[] out = new float[BAND_COUNT];
    float maxMag = 0f;
    for (int b = 0; b < BAND_COUNT; b++) {
      int from = bandEdges[b];
      int to = bandEdges[b + 1];
      float sum = 0f;
      int count = 0;
      for (int i = from; i < to && i < magnitudes.length; i++) {
        sum += magnitudes[i];
        count++;
      }
      float avg = count > 0 ? sum / count : 0f;
      out[b] = avg;
      if (avg > maxMag) maxMag = avg;
    }

    if (maxMag > 1e-5f) {
      // 归一化到 0~1；gamma < 1 让低能量段的起伏也可见
      for (int b = 0; b < BAND_COUNT; b++) {
        float norm = Math.min(1f, out[b] / maxMag);
        out[b] = (float) Math.pow(norm, 0.65);
      }
      bands = out;
      hasSignal = true;
    }
  }

  /** 迭代式基-2 Cooley-Tukey FFT，原地计算。 */
  private void fft(float[] re, float[] im) {
    int n = re.length;
    // 位反转置换
    for (int i = 1, j = 0; i < n; i++) {
      int bit = n >> 1;
      for (; (j & bit) != 0; bit >>= 1) {
        j ^= bit;
      }
      j ^= bit;
      if (i < j) {
        float tr = re[i]; re[i] = re[j]; re[j] = tr;
        float ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }

    for (int len = 2; len <= n; len <<= 1) {
      double ang = -2 * Math.PI / len;
      float wReal = (float) Math.cos(ang);
      float wImag = (float) Math.sin(ang);
      for (int i = 0; i < n; i += len) {
        float curReal = 1f;
        float curImag = 0f;
        for (int j = 0; j < len / 2; j++) {
          int u = i + j;
          int v = i + j + len / 2;
          float vr = re[v] * curReal - im[v] * curImag;
          float vi = re[v] * curImag + im[v] * curReal;
          re[v] = re[u] - vr;
          im[v] = im[u] - vi;
          re[u] += vr;
          im[u] += vi;
          float nextReal = curReal * wReal - curImag * wImag;
          curImag = curReal * wImag + curImag * wReal;
          curReal = nextReal;
        }
      }
    }
  }

  /**
   * 冲刷时清空分析窗口。
   * BaseAudioProcessor.flush() 是 final 的，要重置内部状态必须走 onFlush 钩子。
   */
  @Override
  protected void onFlush() {
    windowFill = 0;
    java.util.Arrays.fill(window, 0f);
  }

  /** 重置时同样清空，并复位频谱快照（切歌后不留上一首的残留）。 */
  @Override
  protected void onReset() {
    windowFill = 0;
    java.util.Arrays.fill(window, 0f);
    clearBands();
  }
}
