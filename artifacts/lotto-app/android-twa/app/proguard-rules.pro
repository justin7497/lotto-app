# Firebase Cloud Messaging (release minify)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

-keepclassmembers class com.ljh.sowonlotto.SowonLottoRouteBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class com.ljh.sowonlotto.SowonLottoNativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
