import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * auth.settings.appVerificationDisabledForTesting = true; 
 * reCAPTCHA отключается
auth.settings.appVerificationDisabledForTesting = true; 
SMS не отправляется
код приходит как 123456
👉 Это подходит:
для локальной разработки
для тестов
для проверки логики backend / socket
❌ Но:
в проде работать не будет
на реальных номерах — нет
 */
auth.settings.appVerificationDisabledForTesting = true; 

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
    vapidKey: process.env.REACT_APP_VAPID_KEY // появится в Firebase Console → Cloud Messaging → Web Push
  });

  console.log("🔥 FCM Token:", token);
  return {token, permission};
}

export function subscribeOnForegroundMessages(handler) {
  onMessage(messaging, handler);
}
