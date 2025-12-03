import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
   apiKey: process.env.REACT_APP_API_KEY,
   authDomain: process.env.REACT_APP_AUTH_DOMAIN,
   projectId: process.env.REACT_APP_PROJECT_ID,
   storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
   messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
   appId: process.env.REACT_APP_APP_ID,
   measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

console.log('firebaseConfig', firebaseConfig);
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
