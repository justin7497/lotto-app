package com.ljh.sowonlotto;

import android.webkit.JavascriptInterface;

/** WebView SPA 현재 경로 — 폰 뒤로가기 시 앱 종료 여부 판단 */
public class SowonLottoRouteBridge {
    private volatile String pathname = "/";

    @JavascriptInterface
    public void setPathname(String path) {
        if (path == null || path.isEmpty() || "/".equals(path)) {
            pathname = "/";
            return;
        }
        pathname = path.startsWith("/") ? path : "/" + path;
    }

    public boolean isHome() {
        return "/".equals(pathname);
    }
}
