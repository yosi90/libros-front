package es.yosiftware.libros;

import java.util.Map;
import org.json.JSONObject;

/** Validated chat data. Private text never crosses the Capacitor bridge. */
final class ChatPushPayload {
    static final String CODE = "chat.message_created";
    final long notificationId;
    final long conversationId;
    final long messageId;
    final String senderName;
    final String preview;

    private ChatPushPayload(long notificationId, long conversationId, long messageId, String senderName, String preview) {
        this.notificationId = notificationId;
        this.conversationId = conversationId;
        this.messageId = messageId;
        this.senderName = senderName;
        this.preview = preview;
    }

    static ChatPushPayload parse(Map<String, String> data) {
        if (!CODE.equals(data.get("code")) || !"chat".equals(data.get("category")) ||
            !"chat_conversation".equals(data.get("contextType"))) return null;
        try {
            long notificationId = positiveId(data.get("notificationId"));
            JSONObject context = new JSONObject(data.get("context"));
            long conversationId = positiveId(context.get("ConversacionId"));
            long messageId = positiveId(context.get("MensajeId"));
            if (notificationId == 0 || conversationId == 0 || messageId == 0) return null;
            return new ChatPushPayload(notificationId, conversationId, messageId,
                plainText(data.get("senderName"), 120), plainText(data.get("messagePreview"), 160));
        } catch (Exception invalidPayload) {
            return null;
        }
    }

    static long positiveId(Object value) {
        if (value == null || !value.toString().matches("[1-9][0-9]{0,15}")) return 0;
        try {
            long id = Long.parseLong(value.toString());
            return id <= 9007199254740991L ? id : 0;
        } catch (NumberFormatException invalidId) { return 0; }
    }

    private static String plainText(String value, int limit) {
        if (value == null) return "";
        String text = value.replaceAll("[\\p{Cc}\\p{Cf}]", " ").replaceAll("\\s+", " ").trim();
        int count = text.codePointCount(0, text.length());
        return count <= limit ? text : text.substring(0, text.offsetByCodePoints(0, limit));
    }

    String tag() { return "chat-conversation-" + conversationId; }
}
