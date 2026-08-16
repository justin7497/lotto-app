package com.ljh.sowonlotto;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import android.content.IntentSender;
import android.webkit.WebView;

import org.json.JSONObject;

/**
 * Google Play 스토어 업데이트 확인·실행.
 */
public class PlayStoreUpdateHelper {
    private static final int UPDATE_REQUEST_CODE = 9911;

    private final AppCompatActivity activity;
    private final AppUpdateManager appUpdateManager;

    public PlayStoreUpdateHelper(AppCompatActivity activity) {
        this.activity = activity;
        this.appUpdateManager = AppUpdateManagerFactory.create(activity);
    }

    public JSONObject buildVersionInfo() throws Exception {
        PackageInfo info =
                activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
        long versionCode =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                        ? info.getLongVersionCode()
                        : info.versionCode;
        JSONObject json = new JSONObject();
        json.put("versionCode", versionCode);
        json.put("versionName", info.versionName != null ? info.versionName : "");
        return json;
    }

    public void checkForUpdate(PlayStoreUpdateCallback callback) {
        appUpdateManager
                .getAppUpdateInfo()
                .addOnSuccessListener(
                        appUpdateInfo -> callback.deliver(buildCheckResult(appUpdateInfo, null)))
                .addOnFailureListener(
                        error ->
                                callback.deliver(
                                        buildCheckResult(null, error.getMessage())));
    }

    private JSONObject buildCheckResult(AppUpdateInfo appUpdateInfo, String error) {
        JSONObject result = new JSONObject();
        try {
            JSONObject version = buildVersionInfo();
            result.put("ok", error == null);
            result.put("versionCode", version.getLong("versionCode"));
            result.put("versionName", version.getString("versionName"));

            if (error != null) {
                result.put("error", error);
                result.put("updateAvailable", false);
                return result;
            }

            int availability = appUpdateInfo.updateAvailability();
            boolean updateAvailable =
                    availability == UpdateAvailability.UPDATE_AVAILABLE
                            || availability
                                    == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
            result.put("updateAvailable", updateAvailable);
            if (updateAvailable) {
                result.put("availableVersionCode", appUpdateInfo.availableVersionCode());
            }
        } catch (Exception e) {
            try {
                result.put("ok", false);
                result.put("updateAvailable", false);
                result.put("error", "version_read_failed");
            } catch (Exception ignored) {
                /* ignore */
            }
        }
        return result;
    }

    private void startUpdateFlow(AppUpdateInfo appUpdateInfo, int updateType) {
        try {
            appUpdateManager.startUpdateFlowForResult(
                    appUpdateInfo,
                    activity,
                    AppUpdateOptions.newBuilder(updateType).build(),
                    UPDATE_REQUEST_CODE);
        } catch (IntentSender.SendIntentException e) {
            openPlayStoreListing();
        }
    }

    public void startUpdate() {
        appUpdateManager
                .getAppUpdateInfo()
                .addOnSuccessListener(
                        appUpdateInfo -> {
                            int availability = appUpdateInfo.updateAvailability();
                            if (availability == UpdateAvailability.UPDATE_AVAILABLE
                                    || availability
                                            == UpdateAvailability
                                                    .DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                                if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                                    startUpdateFlow(appUpdateInfo, AppUpdateType.IMMEDIATE);
                                    return;
                                }
                                if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                                    startUpdateFlow(appUpdateInfo, AppUpdateType.FLEXIBLE);
                                    return;
                                }
                            }
                            openPlayStoreListing();
                        })
                .addOnFailureListener(failure -> openPlayStoreListing());
    }

    public void openPlayStoreListing() {
        String pkg = activity.getPackageName();
        try {
            activity.startActivity(
                    new Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("market://details?id=" + pkg)));
        } catch (ActivityNotFoundException e) {
            activity.startActivity(
                    new Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse(
                                    "https://play.google.com/store/apps/details?id=" + pkg)));
        }
    }

    public void resumeStalledUpdate() {
        appUpdateManager
                .getAppUpdateInfo()
                .addOnSuccessListener(
                        appUpdateInfo -> {
                            if (appUpdateInfo.updateAvailability()
                                    == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                                startUpdateFlow(appUpdateInfo, AppUpdateType.IMMEDIATE);
                            }
                        });
    }

    /** Play에 새 APK가 있으면 WebView에 이벤트 전달 (JS 팝업 트리거) */
    public void probeUpdateAndNotifyWeb(WebView webView) {
        if (webView == null) {
            return;
        }
        appUpdateManager
                .getAppUpdateInfo()
                .addOnSuccessListener(
                        appUpdateInfo -> {
                            int availability = appUpdateInfo.updateAvailability();
                            boolean updateAvailable =
                                    availability == UpdateAvailability.UPDATE_AVAILABLE
                                            || availability
                                                    == UpdateAvailability
                                                            .DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                            if (!updateAvailable) {
                                return;
                            }
                            long availableCode = appUpdateInfo.availableVersionCode();
                            String script =
                                    "try{window.dispatchEvent(new CustomEvent('sowon-play-update-available',{detail:{availableVersionCode:"
                                            + availableCode
                                            + "}}));}catch(e){}";
                            webView.post(() -> webView.evaluateJavascript(script, null));
                        });
    }

    public void onActivityResult(int requestCode, int resultCode) {
        if (requestCode != UPDATE_REQUEST_CODE) {
            return;
        }
        if (resultCode != AppCompatActivity.RESULT_OK) {
            openPlayStoreListing();
        }
    }

    public interface PlayStoreUpdateCallback {
        void deliver(JSONObject result);
    }
}
