// Firebase SW
importScripts("/firebase-config.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp(self.FIREBASE_CONFIG);

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


self.addEventListener("notificationclick", event => {
  event.notification.close();

  const caller = event.notification.data?.caller || "";

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // 1️⃣ если уже есть вкладка — просто фокус
      for (const client of clientsArr) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      // 2️⃣ если вкладок нет — открыть новую
      return self.clients.openWindow(
        `/call?from=${encodeURIComponent(caller)}`
      );
    })()
  );
});

