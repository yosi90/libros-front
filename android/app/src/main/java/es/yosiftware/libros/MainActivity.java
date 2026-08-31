package es.yosiftware.libros;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getPackageName().endsWith(".qa")) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
