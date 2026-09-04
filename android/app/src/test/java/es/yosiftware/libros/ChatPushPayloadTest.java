package es.yosiftware.libros;

import org.junit.Test;
import java.util.HashMap;
import java.util.Map;
import static org.junit.Assert.*;

public class ChatPushPayloadTest {
    private Map<String, String> data() {
        Map<String, String> data = new HashMap<>();
        data.put("code", "chat.message_created");
        data.put("category", "chat");
        data.put("contextType", "chat_conversation");
        data.put("notificationId", "42");
        data.put("context", "{\"ConversacionId\":7,\"MensajeId\":18}");
        data.put("senderName", "  Ana\nLectora ");
        data.put("messagePreview", "Hola\n mundo");
        return data;
    }

    @Test public void validatesAndNormalizesPayloadAndDerivesTagFromTypedId() {
        Map<String, String> data = data();
        data.put("notificationTag", "https://example.invalid");
        ChatPushPayload payload = ChatPushPayload.parse(data);
        assertNotNull(payload);
        assertEquals(42, payload.notificationId);
        assertEquals(7, payload.conversationId);
        assertEquals(18, payload.messageId);
        assertEquals("chat-conversation-7", payload.tag());
        assertEquals("Ana Lectora", payload.senderName);
        assertEquals("Hola mundo", payload.preview);
    }

    @Test public void rejectsInvalidOrUnsafeIdsAndContexts() {
        for (String id : new String[]{"0", "-1", "1.5", "1e3", "9007199254740992", "https://example.invalid"}) {
            Map<String, String> data = data();
            data.put("notificationId", id);
            assertNull(ChatPushPayload.parse(data));
        }
        for (String context : new String[]{"{}", "null", "[]", "{\"ConversacionId\":1.5,\"MensajeId\":18}"}) {
            Map<String, String> data = data();
            data.put("context", context);
            assertNull(ChatPushPayload.parse(data));
        }
        Map<String, String> data = data();
        data.put("contextType", "user_profile");
        assertNull(ChatPushPayload.parse(data));
    }

    @Test public void boundsPrivateTextAndAllowsEmptyPreview() {
        Map<String, String> data = data();
        data.put("senderName", "a".repeat(150));
        data.put("messagePreview", "b".repeat(200));
        ChatPushPayload payload = ChatPushPayload.parse(data);
        assertEquals(120, payload.senderName.length());
        assertEquals(160, payload.preview.length());
        data.remove("messagePreview");
        assertEquals("", ChatPushPayload.parse(data).preview);
    }
}
