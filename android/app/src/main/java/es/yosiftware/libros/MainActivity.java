package es.yosiftware.libros;

import android.os.Bundle;
import android.webkit.WebView;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static volatile boolean foreground = false;

    static boolean isForeground() { return foreground; }

    @Override
    public void onResume() {
        super.onResume();
        foreground = true;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onPause() {
        foreground = false;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppPermissionsPlugin.class);
        super.onCreate(savedInstanceState);
        if (getPackageName().endsWith(".qa")) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
