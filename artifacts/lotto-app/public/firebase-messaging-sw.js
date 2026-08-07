/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA2kU0D3_kANAwtz5hrm-QnwfXQO7gdwxw",
  authDomain: "lotto-app-ljh.web.app",
  projectId: "lotto-app-ljh",
  storageBucket: "lotto-app-ljh.firebasestorage.app",
  messagingSenderId: "618940715584",
  appId: "1:618940715584:web:e8f1c3f490f7f5e05045a5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "소원로또";
  const body = payload.notification?.body ?? "새 알림이 도착했습니다.";
  const link = payload.data?.link ?? payload.fcmOptions?.link ?? "/";
  const targetLink = link.startsWith("http") ? link : `${self.location.origin}${link.startsWith("/") ? link : `/${link}`}`;

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/favicon-32x32.png",
    data: { link: targetLink },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/";
  const target = link.startsWith("http") ? link : `${self.location.origin}${link.startsWith("/") ? link : `/${link}`}`;
  event.waitUntil(clients.openWindow(target));
});
