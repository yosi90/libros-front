package es.yosiftware.libros;

import java.io.IOException;
import java.net.Inet6Address;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.function.Consumer;
import okhttp3.Call;
import okhttp3.EventListener;

/** Per-call state: never infer fallback from elapsed time or an HTTP error. */
final class Ipv6FallbackListener extends EventListener {
    private final Consumer<Boolean> onChange;
    private boolean active;

    Ipv6FallbackListener(Consumer<Boolean> onChange) { this.onChange = onChange; }

    @Override public void connectStart(Call call, InetSocketAddress address, Proxy proxy) {
        if (address.getAddress() instanceof Inet6Address && !active) {
            active = true;
            onChange.accept(true);
        }
    }

    private void finish() {
        if (active) {
            active = false;
            onChange.accept(false);
        }
    }

    @Override public void callEnd(Call call) { finish(); }
    @Override public void callFailed(Call call, IOException failure) { finish(); }
}
