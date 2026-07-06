/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA2kU0D3_kANAwtz5hrm-QnwfXQO7gdwxw",
  authDomain: "lotto-app-ljh.firebaseapp.com",
  projectId: "lotto-app-ljh",
  storageBucket: "lotto-app-ljh.firebasestorage.app",
  messagingSenderId: "618940715584",
  appId: "1:618940715584:web:e8f1c3f490f7f5e05045a5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "로또 당첨 알림";
  const body = payload.notification?.body ?? "추출번호 페이지에서 확인해 보세요.";
  const link = payload.fcmOptions?.link ?? payload.data?.link ?? "/my-numbers";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/favicon-32x32.png",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/my-numbers";
  event.waitUntil(clients.openWindow(link));
});
