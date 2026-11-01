package cn.toside.music.mobile.liquid;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

/**
 * LiquidBlurView 的 RN 桥接。
 *
 * 对外暴露的 props：
 * - blurRadius  目标模糊强度（**屏幕空间**标准差 sigma，px）
 * - downsample  降采样倍率（真正生效，不像社区的库那样被硬编码成 6）
 * - overlayColor 叠加色
 * - blurEnabled 开关
 */
public class LiquidBlurViewManager extends SimpleViewManager<LiquidBlurView> {

  public static final String REACT_CLASS = "LiquidBlurView";

  private final ReactApplicationContext reactContext;

  public LiquidBlurViewManager(ReactApplicationContext reactContext) {
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @Override
  protected LiquidBlurView createViewInstance(ThemedReactContext context) {
    LiquidBlurView view = new LiquidBlurView(context);
    // 模糊源固定为 Activity 的内容根容器：玻璃要模糊的是「它背后那一层页面」，
    // 而不是整棵包含自己的视图树。根容器在 draw 阶段会遍历到自己，
    // LiquidBlurView.draw 里用 CaptureCanvas 判定跳过，避免自我递归。
    if (context.getCurrentActivity() != null) {
      view.setRootView(context.getCurrentActivity().findViewById(android.R.id.content));
    }
    return view;
  }

  @ReactProp(name = "blurRadius", defaultFloat = 9f)
  public void setBlurRadius(LiquidBlurView view, float radius) {
    view.setBlurRadius(radius);
  }

  @ReactProp(name = "downsample", defaultInt = 2)
  public void setDownsample(LiquidBlurView view, int factor) {
    view.setDownsample(factor);
  }

  @ReactProp(name = "overlayColor", customType = "Color")
  public void setOverlayColor(LiquidBlurView view, @Nullable Integer color) {
    view.setOverlayColor(color == null ? 0 : color);
  }

  @ReactProp(name = "blurEnabled", defaultBoolean = true)
  public void setBlurEnabled(LiquidBlurView view, boolean enabled) {
    view.setBlurEnabled(enabled);
  }

  @Override
  public @Nullable Map<String, Object> getExportedCustomDirectEventTypeConstants() {
    return MapBuilder.of();
  }
}