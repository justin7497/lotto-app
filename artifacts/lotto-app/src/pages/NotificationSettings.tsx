import { useEffect, useState } from "react";

import EngagementNotificationSettings from "@/components/EngagementNotificationSettings";
import WinNotificationSettings from "@/components/WinNotificationSettings";
import AppVersionFooter from "@/components/AppVersionFooter";

export default function NotificationSettings() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message && !error) return;
    const t = window.setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [message, error]);

  return (
    <div className="page-content page-content--loose">
      <EngagementNotificationSettings
        onToast={(type, msg) => {
          if (type === "error") setError(msg);
          else setMessage(msg);
        }}
      />

      <WinNotificationSettings
        onToast={(type, msg) => {
          if (type === "error") setError(msg);
          else setMessage(msg);
        }}
      />

      {(error || message) && (
        <p
          className={`text-sm text-center ${error ? "text-red-600" : "text-emerald-600"}`}
          role="status"
        >
          {error ?? message}
        </p>
      )}

      <AppVersionFooter />
    </div>
  );
}
