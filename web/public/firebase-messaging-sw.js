// Firebase SW
importScripts("/firebase-config.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
const messaging = firebase.messaging();
firebase.initializeApp(self.FIREBASE_CONFIG);
console.log("🔥 Firebase initialized in SW", self.FIREBASE_CONFIG);


console.log("🔥 SW started");
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

self.addEventListener("push", (event) => {
  console.log("📦 RAW PUSH EVENT", event);
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
