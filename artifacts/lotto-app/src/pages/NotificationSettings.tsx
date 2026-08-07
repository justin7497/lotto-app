import { useEffect, useState } from "react";

import { Link } from "wouter";

import EngagementNotificationSettings from "@/components/EngagementNotificationSettings";
import WinNotificationSettings from "@/components/WinNotificationSettings";



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



      <p className="text-center text-sm text-gray-500">

        <Link href="/privacy" className="text-link-brand">

          개인정보처리방침

        </Link>

      </p>

    </div>

  );

}

