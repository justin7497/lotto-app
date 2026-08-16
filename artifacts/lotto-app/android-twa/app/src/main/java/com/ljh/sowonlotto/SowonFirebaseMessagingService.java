package com.ljh.sowonlotto;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class SowonFirebaseMessagingService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = "sowon_lotto_engagement";
    public static final String CHANNEL_ID_V2 = "sowon_lotto_push_v2";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        ensureChannel();

        String title = "소원로또";
        String body = "";
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) {
                title = message.getNotification().getTitle();
            }
            if (message.getNotification().getBody() != null) {
                body = message.getNotification().getBody();
            }
        }
        if (body.isEmpty() && message.getData().containsKey("body")) {
            body = message.getData().get("body");
        }
        if (title.equals("소원로또") && message.getData().containsKey("title")) {
            title = message.getData().get("title");
        }
        if (body.isEmpty()) {
            body = "새 알림이 도착했습니다.";
        }

        String channelId = resolveChannelId();

        Intent launchIntent = new Intent(this, WebAppActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        String link = message.getData().get("link");
        if (link != null && !link.isEmpty()) {
            launchIntent.setData(Uri.parse(link));
        }
        PendingIntent pendingIntent =
                PendingIntent.getActivity(
                        this,
                        0,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.drawable.ic_notification_icon)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setDefaults(NotificationCompat.DEFAULT_ALL);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }

    private String resolveChannelId() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return CHANNEL_ID;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return CHANNEL_ID;
        }
        if (manager.getNotificationChannel(CHANNEL_ID_V2) != null) {
            return CHANNEL_ID_V2;
        }
        return CHANNEL_ID;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID,
                            "추첨·번호 안내",
                            NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("토요일 추첨 안내 및 앱 알림");
            manager.createNotificationChannel(channel);
        }
        if (manager.getNotificationChannel(CHANNEL_ID_V2) == null) {
            NotificationChannel channelV2 =
                    new NotificationChannel(
                            CHANNEL_ID_V2,
                            "앱 알림",
                            NotificationManager.IMPORTANCE_HIGH);
            channelV2.setDescription("소원로또 앱 알림");
            manager.createNotificationChannel(channelV2);
        }
    }
}
