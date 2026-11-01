package cn.toside.music.mobile.liquid;

import android.graphics.Canvas;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.views.view.ReactViewGroup;
import com.facebook.react.views.view.ReactViewManager;

/** Keeps the complete glass subtree out of software background captures. */
public class LiquidSurfaceViewManager extends ReactViewManager {
  @Override
  public String getName() {
    return "LiquidSurfaceView";
  }

  @Override
  public ReactViewGroup createViewInstance(ThemedReactContext context) {
    return new SurfaceView(context);
  }

  private static class SurfaceView extends ReactViewGroup {
    SurfaceView(ThemedReactContext context) {
      super(context);
    }

    @Override
    public void draw(Canvas canvas) {
      if (LiquidBlurView.isCapturingBackground()) return;
      super.draw(canvas);
    }
  }
}
