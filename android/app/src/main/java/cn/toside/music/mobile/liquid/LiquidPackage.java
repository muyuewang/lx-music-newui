package cn.toside.music.mobile.liquid;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class LiquidPackage implements ReactPackage {

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    // 液态玻璃的模糊层：替换掉 @react-native-community/blur，
    // 因为那个库的降采样倍率在原生侧被硬编码成 6 倍且无法通过 JS 调整，
    // 等效模糊半径达到 60px，会把背后文字彻底抹平。
    return Arrays.<ViewManager>asList(
        new LiquidBlurViewManager(reactContext), new LiquidSurfaceViewManager());
  }

  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Arrays.<NativeModule>asList(new LiquidModule(reactContext));
  }

}
