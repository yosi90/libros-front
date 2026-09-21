package es.yosiftware.libros;

import android.webkit.JavascriptInterface;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSValue;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.plugin.util.CapacitorHttpUrlConnection;
import com.getcapacitor.plugin.util.HttpRequestHandler;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.CookieHandler;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Dns;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okio.BufferedSink;

/** Replaces CapacitorHttp for both explicit calls and its patched fetch/XHR. */
@CapacitorPlugin(name = "CapacitorHttp")
public class Ipv4HttpPlugin extends Plugin {
    private static final String LOG_TAG = "LibrosHttp";
    private OkHttpClient client;

    @Override public void load() {
        // CapacitorCookies is registered before HTTP. Use that same persistent,
        // HttpOnly-aware store; never introduce a second session cookie jar.
        CookieHandler cookies = CookieHandler.getDefault();
        if (cookies == null) throw new IllegalStateException("Capacitor cookie handler is required");
        client = createClient(cookies, call -> {
            String id = UUID.randomUUID().toString();
            return new Ipv6FallbackListener(active -> notifyListeners("ipv6Fallback",
                new JSObject().put("requestId", id).put("active", active), true));
        });
        getBridge().getWebView().addJavascriptInterface(this, "CapacitorHttpAndroidInterface");
    }

    static OkHttpClient createClient(CookieHandler cookies, okhttp3.EventListener.Factory events) {
        return new OkHttpClient.Builder()
            .dns(new Ipv4FirstDns(Dns.SYSTEM))
            .fastFallback(false)
            .connectTimeout(3, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addNetworkInterceptor(new NativeCookieInterceptor(cookies))
            .eventListenerFactory(events)
            .build();
    }

    @JavascriptInterface public boolean isEnabled() {
        return getBridge().getConfig().getPluginConfiguration("CapacitorHttp").getBoolean("enabled", false);
    }

    @PluginMethod public void request(PluginCall call) { http(call, call.getString("method", "GET")); }
    @PluginMethod public void get(PluginCall call) { http(call, "GET"); }
    @PluginMethod public void post(PluginCall call) { http(call, "POST"); }
    @PluginMethod public void put(PluginCall call) { http(call, "PUT"); }
    @PluginMethod public void patch(PluginCall call) { http(call, "PATCH"); }
    @PluginMethod public void delete(PluginCall call) { http(call, "DELETE"); }

    private void http(PluginCall call, String method) {
        try {
            HttpRequestHandler.HttpURLConnectionBuilder urlBuilder = new HttpRequestHandler.HttpURLConnectionBuilder()
                .setUrl(new URL(call.getString("url", "")))
                .setUrlParams(call.getObject("params", new JSObject()), call.getBoolean("shouldEncodeUrlParams", true));
            // Reuse Capacitor's exact JSON, form-data and binary serialization.
            // This buffer does not connect or send anything.
            BodyBuffer buffer = new BodyBuffer(urlBuilder.url);
            CapacitorHttpUrlConnection serializer = new CapacitorHttpUrlConnection(buffer);
            serializer.setRequestHeaders(call.getObject("headers", new JSObject()));
            String userAgent = buffer.getRequestProperty("x-cap-user-agent");
            if (userAgent != null) buffer.setRequestProperty("User-Agent", userAgent);
            final String nativeMethod = method.toUpperCase(Locale.ROOT);
            boolean hasBody = !nativeMethod.equals("GET") && !nativeMethod.equals("HEAD");
            if (hasBody && call.getData().has("data")) {
                serializer.setRequestBody(call, new JSValue(call, "data"), call.getString("dataType"));
            }
            Request.Builder request = new Request.Builder().url(urlBuilder.url);
            for (Map.Entry<String, List<String>> header : buffer.getRequestProperties().entrySet()) {
                if (header.getKey().equalsIgnoreCase("x-cap-user-agent")) continue;
                for (String value : header.getValue()) request.addHeader(header.getKey(), value);
            }
            RequestBody body = hasBody ? oneShotBody(buffer.bytes.toByteArray(), buffer.getRequestProperty("Content-Type")) : null;
            request.method(nativeMethod, body);
            int connectTimeout = call.getInt("connectTimeout", 3000);
            OkHttpClient transport = client.newBuilder()
                .callTimeout(25, TimeUnit.SECONDS)
                .connectTimeout(connectTimeout > 0 ? Math.min(connectTimeout, 3000) : 3000, TimeUnit.MILLISECONDS)
                .readTimeout(call.getInt("readTimeout", 30000), TimeUnit.MILLISECONDS)
                .followRedirects(!call.getBoolean("disableRedirects", false))
                .followSslRedirects(false)
                .build();
            Request nativeRequest = request.build();
            long startedAt = System.nanoTime();
            Log.i(LOG_TAG, "start " + nativeMethod + " " + nativeRequest.url().encodedPath());
            transport.newCall(nativeRequest).enqueue(new Callback() {
                @Override public void onFailure(Call networkCall, IOException failure) {
                    Log.w(LOG_TAG, "fail " + nativeMethod + " " + nativeRequest.url().encodedPath() + " afterMs=" + elapsedMs(startedAt) + " type=" + failure.getClass().getSimpleName());
                    call.reject("No se pudo conectar con el servidor", failure.getClass().getSimpleName());
                }

                @Override public void onResponse(Call networkCall, Response response) {
                    try (response) {
                        Log.i(LOG_TAG, "headers " + nativeMethod + " " + nativeRequest.url().encodedPath() + " status=" + response.code() + " length=" + response.body().contentLength() + " afterMs=" + elapsedMs(startedAt));
                        JSObject headers = new JSObject();
                        for (String name : response.headers().names()) {
                            headers.put(name, String.join(", ", response.headers(name)));
                        }
                        String type = call.getString("responseType", "text");
                        String contentType = response.header("Content-Type", "");
                        Object data;
                        if (contentType.contains("application/json") || type.equals("json")) {
                            data = HttpRequestHandler.parseJSON(response.body().string());
                        } else if (type.equals("blob") || type.equals("arraybuffer")) {
                            data = android.util.Base64.encodeToString(response.body().bytes(), android.util.Base64.NO_WRAP);
                        } else {
                            data = response.body().string();
                        }
                        call.resolve(new JSObject().put("status", response.code()).put("headers", headers)
                            .put("url", response.request().url().toString()).put("data", data));
                        Log.i(LOG_TAG, "resolved " + nativeMethod + " " + nativeRequest.url().encodedPath() + " afterMs=" + elapsedMs(startedAt));
                    } catch (Exception failure) {
                        Log.w(LOG_TAG, "read-fail " + nativeMethod + " " + nativeRequest.url().encodedPath() + " afterMs=" + elapsedMs(startedAt) + " type=" + failure.getClass().getSimpleName());
                        call.reject("No se pudo leer la respuesta del servidor", failure.getClass().getSimpleName());
                    }
                }
            });
        } catch (Exception failure) {
            call.reject("No se pudo preparar la petición", failure.getClass().getSimpleName());
        }
    }

    private static long elapsedMs(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    static RequestBody oneShotBody(byte[] bytes, String contentType) {
        return new RequestBody() {
            @Override public MediaType contentType() { return contentType == null ? null : MediaType.parse(contentType); }
            @Override public long contentLength() { return bytes.length; }
            // Connection attempts can try another IP BEFORE sending. A refresh,
            // upload or mutation already sent must never be replayed on failure.
            @Override public boolean isOneShot() { return true; }
            @Override public void writeTo(BufferedSink sink) throws IOException { sink.write(bytes); }
        };
    }

    @Override protected void handleOnDestroy() {
        if (client != null) {
            client.dispatcher().cancelAll();
            client.connectionPool().evictAll();
            client.dispatcher().executorService().shutdown();
        }
        super.handleOnDestroy();
    }

    private static final class BodyBuffer extends HttpURLConnection {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private final Map<String, List<String>> headers = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        BodyBuffer(URL url) { super(url); }
        @Override public void setRequestProperty(String key, String value) {
            if (value != null) headers.put(key, java.util.Collections.singletonList(value));
        }
        @Override public String getRequestProperty(String key) {
            List<String> values = headers.get(key);
            return values == null ? null : values.get(0);
        }
        @Override public Map<String, List<String>> getRequestProperties() { return headers; }
        @Override public OutputStream getOutputStream() { return bytes; }
        @Override public void connect() { throw new UnsupportedOperationException("Serialization only"); }
        @Override public void disconnect() { }
        @Override public boolean usingProxy() { return false; }
    }
}
