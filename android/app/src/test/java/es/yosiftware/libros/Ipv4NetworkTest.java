package es.yosiftware.libros;

import static org.junit.Assert.*;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.InetAddress;
import java.net.Proxy;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.SocketPolicy;
import org.junit.Test;

public class Ipv4NetworkTest {
    private final InetAddress ipv4 = InetAddress.getByName("127.0.0.1");
    private final InetAddress ipv6 = InetAddress.getByName("::1");

    public Ipv4NetworkTest() throws Exception { }

    @Test public void dnsPrefersIpv4WithoutDroppingIpv6OrChangingSystemOrderWithinFamily() throws Exception {
        InetAddress second = InetAddress.getByName("127.0.0.2");
        List<InetAddress> system = Collections.unmodifiableList(Arrays.asList(ipv6, ipv4, second));
        assertEquals(Arrays.asList(ipv4, second, ipv6), new Ipv4FirstDns(host -> system).lookup("example.invalid"));
        assertEquals(Collections.singletonList(ipv6), new Ipv4FirstDns(host -> Collections.singletonList(ipv6)).lookup("ipv6.invalid"));
    }

    private OkHttpClient client(List<InetAddress> addresses, List<Boolean> events) {
        return Ipv4HttpPlugin.createClient(new CookieManager(), call -> new Ipv6FallbackListener(events::add))
            .newBuilder().dns(new Ipv4FirstDns(host -> addresses))
            .proxy(Proxy.NO_PROXY).connectTimeout(300, TimeUnit.MILLISECONDS).build();
    }

    @Test public void ipv4SuccessDoesNotEmitFallbackEvenWhenSystemDnsPutsIpv6First() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv4, 0);
            server.enqueue(new MockResponse().setBody("ok"));
            List<Boolean> events = new ArrayList<>();
            Request request = new Request.Builder().url(server.url("/").newBuilder().host("example.invalid").build()).build();
            try (Response response = client(Arrays.asList(ipv6, ipv4), events).newCall(request).execute()) {
                assertEquals("ok", response.body().string());
            }
            assertTrue(events.isEmpty());
            assertEquals(1, server.getRequestCount());
        }
    }

    @Test public void failedIpv4FallsBackToIpv6WithStartAndEndAndOnlyOnePost() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv6, 0);
            server.enqueue(new MockResponse().setBody("restored"));
            List<Boolean> events = new ArrayList<>();
            Request request = new Request.Builder().url(server.url("/").newBuilder().host("example.invalid").build())
                .post(Ipv4HttpPlugin.oneShotBody("{}".getBytes(), "application/json")).build();
            try (Response response = client(Arrays.asList(ipv6, ipv4), events).newCall(request).execute()) {
                assertEquals("restored", response.body().string());
            }
            assertEquals(Arrays.asList(true, false), events);
            assertEquals(1, server.getRequestCount());
            assertEquals("{}", server.takeRequest().getBody().readUtf8());
        }
    }

    @Test public void bothFamiliesFailAndFeedbackIsCleared() throws Exception {
        int port;
        try (MockWebServer server = new MockWebServer()) { server.start(ipv6, 0); port = server.getPort(); }
        List<Boolean> events = new ArrayList<>();
        try {
            client(Arrays.asList(ipv6, ipv4), events).newCall(new Request.Builder()
                .url("http://example.invalid:" + port + "/").build()).execute();
            fail("Expected connection failure");
        } catch (java.io.IOException expected) { }
        assertEquals(Arrays.asList(true, false), events);
    }

    @Test public void httpFailureDoesNotCauseIpv6FallbackOrReplayMutation() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv4, 0);
            server.enqueue(new MockResponse().setResponseCode(503).setHeader("Retry-After", "0"));
            List<Boolean> events = new ArrayList<>();
            Request request = new Request.Builder().url(server.url("/").newBuilder().host("example.invalid").build())
                .post(Ipv4HttpPlugin.oneShotBody("{}".getBytes(), "application/json")).build();
            try (Response response = client(Arrays.asList(ipv4, ipv6), events).newCall(request).execute()) {
                assertEquals(503, response.code());
            }
            assertTrue(events.isEmpty());
            assertEquals(1, server.getRequestCount());
        }
    }

    @Test public void lostResponseDoesNotReplayRefresh() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv4, 0);
            server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST));
            Request request = new Request.Builder().url(server.url("/refresh"))
                .post(Ipv4HttpPlugin.oneShotBody("{}".getBytes(), "application/json")).build();
            try {
                client(Arrays.asList(ipv4, ipv6), new ArrayList<>()).newCall(request).execute();
                fail("Expected lost response");
            } catch (java.io.IOException expected) { }
            assertEquals(1, server.getRequestCount());
        }
    }

    @Test public void httpOnlyCookiesSurviveAcrossRequestsInTheSharedCookieHandler() throws Exception {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv4, 0);
            server.enqueue(new MockResponse().addHeader("Set-Cookie", "session=test; HttpOnly; Path=/"));
            server.enqueue(new MockResponse());
            OkHttpClient client = Ipv4HttpPlugin.createClient(cookies, call -> new Ipv6FallbackListener(active -> { }));
            try (Response response = client.newCall(new Request.Builder().url(server.url("/csrf")).build()).execute()) { response.body().string(); }
            try (Response response = client.newCall(new Request.Builder().url(server.url("/refresh")).build()).execute()) { response.body().string(); }
            server.takeRequest();
            assertEquals("session=test", server.takeRequest().getHeader("Cookie"));
        }
    }

    @Test public void cookieHandlerReceivesSameSiteAndSecureWithoutNormalization() throws Exception {
        List<String> received = new ArrayList<>();
        java.net.CookieHandler cookies = new java.net.CookieHandler() {
            @Override public java.util.Map<String, List<String>> get(java.net.URI uri, java.util.Map<String, List<String>> headers) {
                return Collections.emptyMap();
            }
            @Override public void put(java.net.URI uri, java.util.Map<String, List<String>> headers) {
                headers.forEach((key, values) -> { if (key.equalsIgnoreCase("Set-Cookie")) received.addAll(values); });
            }
        };
        String raw = "session=test; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600";
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv4, 0);
            server.enqueue(new MockResponse().addHeader("Set-Cookie", raw));
            OkHttpClient client = Ipv4HttpPlugin.createClient(cookies, call -> new Ipv6FallbackListener(active -> { }));
            try (Response response = client.newCall(new Request.Builder().url(server.url("/")).build()).execute()) { response.body().string(); }
            assertEquals(Collections.singletonList(raw), received);
        }
    }

    @Test public void redirectsDoNotLeakSessionCookiesToAnotherHost() throws Exception {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        cookies.put(java.net.URI.create("http://source.invalid/"), Collections.singletonMap("Set-Cookie",
            Collections.singletonList("session=test; HttpOnly; Path=/")));
        try (MockWebServer server = new MockWebServer()) {
            server.start(ipv4, 0);
            server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location", server.url("/end").newBuilder().host("target.invalid").build()));
            server.enqueue(new MockResponse().setBody("ok"));
            OkHttpClient client = Ipv4HttpPlugin.createClient(cookies, call -> new Ipv6FallbackListener(active -> { }))
                .newBuilder().dns(host -> Collections.singletonList(ipv4)).proxy(Proxy.NO_PROXY).build();
            try (Response response = client.newCall(new Request.Builder().url(server.url("/").newBuilder().host("source.invalid").build()).build()).execute()) { response.body().string(); }
            assertEquals("session=test", server.takeRequest().getHeader("Cookie"));
            assertNull(server.takeRequest().getHeader("Cookie"));
        }
    }
}
