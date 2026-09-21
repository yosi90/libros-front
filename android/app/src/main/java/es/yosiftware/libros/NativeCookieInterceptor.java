package es.yosiftware.libros;

import java.io.IOException;
import java.net.CookieHandler;
import java.net.URI;
import java.util.List;
import java.util.Map;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

/** Preserve raw Set-Cookie attributes (including SameSite) in Capacitor's store. */
final class NativeCookieInterceptor implements Interceptor {
    private final CookieHandler cookies;
    NativeCookieInterceptor(CookieHandler cookies) { this.cookies = cookies; }

    @Override public Response intercept(Chain chain) throws IOException {
        Request original = chain.request();
        URI uri = original.url().uri();
        Request.Builder request = original.newBuilder();
        for (Map.Entry<String, List<String>> entry : cookies.get(uri, original.headers().toMultimap()).entrySet()) {
            if ("Cookie".equalsIgnoreCase(entry.getKey()) || "Cookie2".equalsIgnoreCase(entry.getKey())) {
                if (!entry.getValue().isEmpty()) request.header(entry.getKey(), String.join("; ", entry.getValue()));
            }
        }
        Response response = chain.proceed(request.build());
        try {
            cookies.put(uri, response.headers().toMultimap());
            return response;
        } catch (IOException | RuntimeException failure) {
            response.close();
            throw failure;
        }
    }
}
