package com.ljh.sowonlotto;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;

public class WebAppActivity extends AppCompatActivity {
    private static final int REQ_CAMERA = 2001;
    private static final int REQ_NOTIFICATIONS = 2002;
    private static final String HOST = "lotto-app-ljh.web.app";

    private FrameLayout root;
    private WebView webView;
    private PermissionRequest pendingWebPermissionRequest;
    private Runnable pendingAfterNotificationPermission;
    private Runnable pendingOnNotificationDenied;
    private ValueCallback<Uri[]> filePathCallback;
    private PlayStoreUpdateHelper playStoreUpdateHelper;

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    result -> {
                        if (filePathCallback == null) {
                            return;
                        }
                        Uri[] uris = null;
                        if (result.getResultCode() == RESULT_OK) {
                            uris = parseFileChooserUris(result.getData());
                        }
                        filePathCallback.onReceiveValue(uris);
                        filePathCallback = null;
                    });

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        }

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(Color.parseColor("#127a6e"));
        window.setNavigationBarColor(Color.parseColor("#1A2848"));

        root = new FrameLayout(this);
        setContentView(root);

        playStoreUpdateHelper = new PlayStoreUpdateHelper(this);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(118);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        try {
            String version = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            PackageInfo pkgInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            long versionCode =
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                            ? pkgInfo.getLongVersionCode()
                            : pkgInfo.versionCode;
            settings.setUserAgentString(
                    settings.getUserAgentString()
                            + " SowonLottoApp/"
                            + version
                            + " vc/"
                            + versionCode);
        } catch (PackageManager.NameNotFoundException ignored) {
            settings.setUserAgentString(settings.getUserAgentString() + " SowonLottoApp/1.0.7");
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermissionRequest(request));
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams fileChooserParams) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });

        webView.addJavascriptInterface(
                new SowonLottoNativeBridge(this, webView, playStoreUpdateHelper), "SowonLottoNative");
        webView.addJavascriptInterface(new SowonLottoRouteBridge(), "SowonLottoRoute");

        getOnBackPressedDispatcher()
                .addCallback(
                        this,
                        new OnBackPressedCallback(true) {
                            @Override
                            public void handleOnBackPressed() {
                                handleAppBack();
                            }
                        });

        root.addView(
                webView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));

        String launchUrl = getString(R.string.launchUrl);
        Uri deepLink = getIntent() != null ? getIntent().getData() : null;
        if (deepLink != null && HOST.equals(deepLink.getHost())) {
            webView.loadUrl(deepLink.toString());
        } else {
            webView.loadUrl(launchUrl);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ensureNotificationPermissionThen(
                    () -> {
                        if (webView != null) {
                            webView.postDelayed(
                                    () ->
                                            webView.evaluateJavascript(
                                                    "window.dispatchEvent(new Event('sowon-push-permission-granted'));",
                                                    null),
                                    1500);
                        }
                    },
                    () -> {});
        }
    }

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
    }

    private boolean requestIncludesCamera(PermissionRequest request) {
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                return true;
            }
        }
        return false;
    }

    private void handleWebPermissionRequest(PermissionRequest request) {
        if (!requestIncludesCamera(request)) {
            request.deny();
            return;
        }

        if (hasCameraPermission()) {
            request.grant(request.getResources());
            return;
        }

        pendingWebPermissionRequest = request;
        ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.CAMERA },
                REQ_CAMERA);
    }

    private void grantPendingWebPermissionIfNeeded() {
        if (pendingWebPermissionRequest == null || !hasCameraPermission()) {
            return;
        }
        PermissionRequest request = pendingWebPermissionRequest;
        pendingWebPermissionRequest = null;
        request.grant(request.getResources());
    }

    private void denyPendingWebPermissionIfNeeded() {
        if (pendingWebPermissionRequest == null) {
            return;
        }
        PermissionRequest request = pendingWebPermissionRequest;
        pendingWebPermissionRequest = null;
        request.deny();
    }

    void ensureNotificationPermissionThen(Runnable onGranted, Runnable onDenied) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            onGranted.run();
            return;
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            onGranted.run();
            return;
        }
        pendingAfterNotificationPermission = onGranted;
        pendingOnNotificationDenied = onDenied;
        ActivityCompat.requestPermissions(
                this, new String[] {Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
    }

    private void finishNotificationPermissionRequest(boolean granted) {
        Runnable grantedRunnable = pendingAfterNotificationPermission;
        Runnable deniedRunnable = pendingOnNotificationDenied;
        pendingAfterNotificationPermission = null;
        pendingOnNotificationDenied = null;
        if (granted) {
            if (grantedRunnable != null) {
                grantedRunnable.run();
            }
            return;
        }
        if (deniedRunnable != null) {
            deniedRunnable.run();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (playStoreUpdateHelper != null) {
            playStoreUpdateHelper.resumeStalledUpdate();
            if (webView != null) {
                playStoreUpdateHelper.probeUpdateAndNotifyWeb(webView);
            }
        }
        grantPendingWebPermissionIfNeeded();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (playStoreUpdateHelper != null) {
            playStoreUpdateHelper.onActivityResult(requestCode, resultCode);
        }
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_NOTIFICATIONS) {
            boolean granted =
                    grantResults.length > 0
                            && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            finishNotificationPermissionRequest(granted);
            return;
        }
        if (requestCode != REQ_CAMERA) {
            return;
        }

        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            grantPendingWebPermissionIfNeeded();
            return;
        }

        denyPendingWebPermissionIfNeeded();
    }

    private static boolean jsReturnedTrue(@Nullable String raw) {
        return "true".equals(raw) || "\"true\"".equals(raw);
    }

    @Nullable
    private static Uri[] parseFileChooserUris(@Nullable Intent data) {
        if (data == null) {
            return null;
        }
        ClipData clipData = data.getClipData();
        if (clipData != null) {
            int count = clipData.getItemCount();
            Uri[] uris = new Uri[count];
            for (int i = 0; i < count; i++) {
                uris[i] = clipData.getItemAt(i).getUri();
            }
            return uris;
        }
        Uri uri = data.getData();
        if (uri != null) {
            return new Uri[] {uri};
        }
        return null;
    }

    /** 나야나야 패턴 — WebView.onBack() 위임, 미처리 시 백그라운드 */
    private void handleAppBack() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return !!(window.SowonLottoWeb&&window.SowonLottoWeb.onBack&&window.SowonLottoWeb.onBack());}catch(e){return false;}})();",
                raw -> {
                    if (!jsReturnedTrue(raw)) {
                        moveTaskToBack(true);
                    }
                });
    }

    @Override
    @Deprecated
    public void onBackPressed() {
        handleAppBack();
    }

    @Override
    protected void onDestroy() {
        denyPendingWebPermissionIfNeeded();
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
