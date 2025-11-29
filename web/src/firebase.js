import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
   apiKey: "AIzaSyB_Az-ESDMIrJ90IIYHSb-qMWL8Yp6MinY",
   authDomain: "chat-pwa-j238.firebaseapp.com",
   projectId: "chat-pwa-j238",
   storageBucket: "chat-pwa-j238.firebasestorage.app",
   messagingSenderId: "121764988976",
   appId: "1:121764988976:web:928a3a40a65d151ff845f5",
   measurementId: "G-4S439WR4C9"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Получить Permission + токен FCM
export async function requestNotificationPermission() {
  console.log("🔔 Запрашиваю разрешение на уведомления...");

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    console.log("🔕 Пользователь отклонил разрешение.");
    return null;
  }

  const token = await getToken(messaging, {
    vapidKey: "ВАШ_PUBLIC_VAPID_KEY" // появится в Firebase Console → Cloud Messaging → Web Push
  });

  console.log("🔥 FCM Token:", token);
  return token;
}

export function subscribeOnForegroundMessages(handler) {
  onMessage(messaging, handler);
}
