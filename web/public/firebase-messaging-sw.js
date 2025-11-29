// Firebase SW
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
   apiKey: "AIzaSyB_Az-ESDMIrJ90IIYHSb-qMWL8Yp6MinY",
   authDomain: "chat-pwa-j238.firebaseapp.com",
   projectId: "chat-pwa-j238",
   storageBucket: "chat-pwa-j238.firebasestorage.app",
   messagingSenderId: "121764988976",
   appId: "1:121764988976:web:928a3a40a65d151ff845f5",
});

const messaging = firebase.messaging();

// Пуш, когда приложение закрыто
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Background push:", payload);

  const { title, body, icon, data } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon,
    data
  });
});

// Обработчик клика по пушу
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = new URL("/call?from=" + event.notification.data.from, self.location.origin);

  event.waitUntil(self.clients.matchAll({ type: "window" }).then((clientList) => {
    for (const client of clientList) {
      if (client.url === urlToOpen.href && "focus" in client) return client.focus();
    }
    return clients.openWindow(urlToOpen.href);
  }));
});
