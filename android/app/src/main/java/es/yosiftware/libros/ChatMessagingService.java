package es.yosiftware.libros;

import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.RemoteMessage;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ChatMessagingService extends MessagingService {
    private static final String CHANNEL = "chat-messages";
    private static final String PUBLIC_TITLE = "Nuevo mensaje";
    private static final String PUBLIC_BODY = "Tienes un mensaje nuevo";
    private static final Object DEDUPE_LOCK = new Object();

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        // Legacy automatic notifications retain the existing Capacitor behavior.
        boolean chatData = ChatPushPayload.CODE.equals(message.getData().get("code")) ||
            "chat".equals(message.getData().get("category")) || message.getData().containsKey("senderName") ||
            message.getData().containsKey("messagePreview");
        if (!chatData || message.getNotification() != null) {
            super.onMessageReceived(message);
            return;
        }
        ChatPushPayload payload = ChatPushPayload.parse(message.getData());
        if (payload == null) return;
        synchronized (DEDUPE_LOCK) {
            SharedPreferences history = getSharedPreferences("chat-push-receipts", MODE_PRIVATE);
            String id = String.valueOf(payload.notificationId);
            List<String> receipts = new ArrayList<>(Arrays.asList(history.getString("ids", "").split(",")));
            if (receipts.contains(id)) return;
            KeyguardManager keyguard = getSystemService(KeyguardManager.class);
            boolean foreground = MainActivity.isForeground() && (keyguard == null || !keyguard.isKeyguardLocked());
            if (!foreground) showNotification(payload);
            receipts.add(id);
            while (receipts.size() > 256) receipts.remove(0);
            // Persist only IDs, never sender, preview or the complete payload.
            history.edit().putString("ids", TextUtils.join(",", receipts)).commit();
            Map<String, String> safeData = new HashMap<>();
            safeData.put("notificationId", id);
            safeData.put("nativeBackground", String.valueOf(!foreground));
            PushNotificationsPlugin.sendRemoteMessage(new RemoteMessage.Builder("local-chat")
                .setMessageId(id).setData(safeData).build());
        }
    }

    private void showNotification(ChatPushPayload payload) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Mensajes", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Mensajes de tus conversaciones");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            manager.createNotificationChannel(channel);
        }
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return;
        Intent intent = new Intent(this, MainActivity.class)
            .setAction(getPackageName() + ".OPEN_CHAT")
            .setData(Uri.parse("libros-internal://chat/" + payload.conversationId))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("google.message_id", String.valueOf(payload.notificationId))
            .putExtra("notificationId", String.valueOf(payload.notificationId))
            .putExtra("conversationId", String.valueOf(payload.conversationId))
            .putExtra("messageId", String.valueOf(payload.messageId));
        PendingIntent tap = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification publicVersion = baseNotification().setContentTitle(PUBLIC_TITLE).setContentText(PUBLIC_BODY)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).build();
        Notification notification = baseNotification()
            .setContentTitle(payload.senderName.isEmpty() ? PUBLIC_TITLE : "Mensaje de " + payload.senderName)
            .setContentText(payload.preview.isEmpty() ? PUBLIC_BODY : payload.preview)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(payload.preview.isEmpty() ? PUBLIC_BODY : payload.preview))
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setPublicVersion(publicVersion)
            .setContentIntent(tap).setAutoCancel(true).build();
        try { manager.notify(payload.tag(), 0, notification); }
        catch (SecurityException permissionRevoked) { /* Permission can change after the check. */ }
    }

    private NotificationCompat.Builder baseNotification() {
        return new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.drawable.ic_chat_notification)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH);
    }
}
