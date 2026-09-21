package es.yosiftware.libros;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import okhttp3.Dns;

/** Keep system DNS (including DNS64), changing only address preference. */
final class Ipv4FirstDns implements Dns {
    private final Dns delegate;

    Ipv4FirstDns(Dns delegate) { this.delegate = delegate; }

    @Override public List<InetAddress> lookup(String hostname) throws UnknownHostException {
        List<InetAddress> addresses = new ArrayList<>(delegate.lookup(hostname));
        addresses.sort((a, b) -> Boolean.compare(!(a instanceof Inet4Address), !(b instanceof Inet4Address)));
        return addresses;
    }
}
