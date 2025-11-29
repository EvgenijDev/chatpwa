// Firebase SW
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
   apiKey: process.env.REACT_APP_API_KEY,
   authDomain: process.env.REACT_APP_AUTH_DOMAIN,
   projectId: process.env.REACT_APP_PROJECT_ID,
   storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
   messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
   appId: process.env.REACT_APP_APP_ID,
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
