package com.ljh.sowonlotto;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.content.ContextCompat;

import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

/**
 * WebView ↔ 앱 네이티브 FCM 브릿지.
 * window.SowonLottoNative.fetchPushToken(callbackName) 등으로 호출.
 */
public class SowonLottoNativeBridge {
    private final WebAppActivity activity;
    private final WebView webView;
    private final PlayStoreUpdateHelper playStoreUpdateHelper;

    public SowonLottoNativeBridge(
            WebAppActivity activity, WebView webView, PlayStoreUpdateHelper playStoreUpdateHelper) {
        this.activity = activity;
        this.webView = webView;
        this.playStoreUpdateHelper = playStoreUpdateHelper;
    }

    @JavascriptInterface
    public boolean isPushBridgeAvailable() {
        return true;
    }

    @JavascriptInterface
    public String getAppVersionInfo() {
        try {
            return playStoreUpdateHelper.buildVersionInfo().toString();
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":\"version_read_failed\"}";
        }
    }

    @JavascriptInterface
    public void checkPlayStoreUpdate(String callbackName) {
        activity.runOnUiThread(
                () ->
                        playStoreUpdateHelper.checkForUpdate(
                                result -> invokeCallback(callbackName, result)));
    }

    @JavascriptInterface
    public void openPlayStore() {
        activity.runOnUiThread(() -> playStoreUpdateHelper.openPlayStoreListing());
    }

    @JavascriptInterface
    public void startPlayStoreUpdate() {
        activity.runOnUiThread(() -> playStoreUpdateHelper.startUpdate());
    }

    @JavascriptInterface
    public String getPushPermissionState() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            int state =
                    ContextCompat.checkSelfPermission(
                            activity, Manifest.permission.POST_NOTIFICATIONS);
            if (state == PackageManager.PERMISSION_GRANTED) {
                return "granted";
            }
            if (!activity.shouldShowRequestPermissionRationale(
                    Manifest.permission.POST_NOTIFICATIONS)) {
                // denied permanently or not yet asked — treat as default until denied callback
            }
            return ContextCompat.checkSelfPermission(
                            activity, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_DENIED
                    ? "denied"
                    : "default";
        }
        return "granted";
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        activity.runOnUiThread(
                () -> {
                    Intent intent = new Intent();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        intent.setAction(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        intent.putExtra(
                                android.provider.Settings.EXTRA_APP_PACKAGE,
                                activity.getPackageName());
                    } else {
                        intent.setAction(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(
                                android.net.Uri.parse("package:" + activity.getPackageName()));
                    }
                    activity.startActivity(intent);
                });
    }

    @JavascriptInterface
    public void fetchPushToken(String callbackName) {
        activity.runOnUiThread(
                () ->
                        activity.ensureNotificationPermissionThen(
                                () -> resolveToken(callbackName),
                                () -> resolvePermissionDenied(callbackName)));
    }

    private void resolvePermissionDenied(String callbackName) {
        JSONObject result = new JSONObject();
        try {
            result.put("ok", false);
            result.put("error", "permission_denied");
            result.put("permission", "denied");
        } catch (Exception ignored) {
            /* ignore */
        }
        invokeCallback(callbackName, result);
    }

    @JavascriptInterface
    public void deletePushToken(String callbackName) {
        FirebaseMessaging.getInstance()
                .deleteToken()
                .addOnCompleteListener(
                        task -> {
                            JSONObject result = new JSONObject();
                            try {
                                result.put("ok", task.isSuccessful());
                                if (!task.isSuccessful()) {
                                    result.put("error", "delete_failed");
                                }
                            } catch (Exception ignored) {
                                /* ignore */
                            }
                            invokeCallback(callbackName, result);
                        });
    }

    private void resolveToken(String callbackName) {
        Task<String> task = FirebaseMessaging.getInstance().getToken();
        task.addOnCompleteListener(
                completed -> {
                    JSONObject result = new JSONObject();
                    try {
                        if (completed.isSuccessful() && completed.getResult() != null) {
                            result.put("ok", true);
                            result.put("token", completed.getResult());
                            result.put(
                                    "permission",
                                    getPushPermissionState());
                        } else {
                            result.put("ok", false);
                            result.put("error", "token_failed");
                            result.put(
                                    "permission",
                                    getPushPermissionState());
                        }
                    } catch (Exception e) {
                        try {
                            result.put("ok", false);
                            result.put("error", "token_exception");
                        } catch (Exception ignored) {
                            /* ignore */
                        }
                    }
                    invokeCallback(callbackName, result);
                });
    }

    private void invokeCallback(String callbackName, JSONObject payload) {
        if (!isSafeCallbackName(callbackName)) {
            return;
        }
        String script =
                "try{window['"
                        + callbackName
                        + "']("
                        + payload.toString()
                        + ");}catch(e){}";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private boolean isSafeCallbackName(String callbackName) {
        return callbackName != null
                && (callbackName.matches("__sowonPushCb_\\d+")
                        || callbackName.matches("__sowonUpdateCb_\\d+"));
    }
}
