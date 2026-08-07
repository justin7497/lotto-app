import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isAppWebViewShell } from "@/utils/nativeQrBridge";
import { bindNativeOverlayBackBridge } from "@/utils/overlayBackStack";

bindNativeOverlayBackBridge();

if (isAppWebViewShell()) {
  document.documentElement.classList.add("app-native-webview");
}

createRoot(document.getElementById("root")!).render(<App />);
