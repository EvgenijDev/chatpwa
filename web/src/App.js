import { useEffect, useState } from "react";
import socket from "./Socket";
import VideoCall from "./VideoCall";
import { requestNotificationPermission, auth } from "./firebase";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";


function App() {
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [registered, setRegistered] = useState(false);
  const FAMILY_PASSWORD = "family-secret";
  const [notificationsAlert, setNotificationsAlert] = useState(false);
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState(null);


  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(user => setUser(user))
      .catch(() => setUser(null));
  }, []);


  // Слушаем сервер
  useEffect(() => {
    // Подписка на список пользователей
    socket.on("user_list", ({all, online}) => {
      // если username ещё не установлен, просто показываем всех
      console.log("⚡ получение user_list app.js");
      if(!all || !online) return;
      setAllUsers(all.filter((u) => u !== username));
      setOnlineUsers(online);
      return () => socket.off("user_list");

    }, [username]);
  
    // Подтверждение регистрации
    socket.on("register_ok", async ({ name }) => {

      setUsername(name);
      setRegistered(true);
      console.log("⚡ регистрация нового пользователя ", name);
      // после регистрации запросим актуальный список
      socket.emit("request_user_list");

      const { token, permission } = await requestNotificationPermission();
      console.log('requestNotificationPermission', permission);
      if (token) {
        fetch("/api/savePushToken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, token })
        });
      }
    });

    socket.on("register_failed", (data) => {
      console.log("❌ Register Failed:", data);
    });
  
    return () => {
      socket.off("user_list");
      socket.off("register_failed");
      socket.off("register_ok");
    };
  }, [username]);

  const register = () => {
    if (!inputName.trim()) return alert("Введите имя!");
    socket.emit("register", { name: inputName.trim(), password: FAMILY_PASSWORD });
  };

  const sendCode = async () => {
    window.recaptchaVerifier = new RecaptchaVerifier(
      "recaptcha-container",
      { size: "invisible" },
      auth
    );

    const confirmation = await signInWithPhoneNumber(
      auth,
      phone,
      window.recaptchaVerifier
    );

    window.confirmationResult = confirmation;
  };

  const verifyCode = async () => {
    const result = await window.confirmationResult.confirm(code);
  
    const idToken = await result.user.getIdToken();
  
    // отправляем токен на backend
    await fetch("/api/auth/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
  };
  



  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      {/* 🔔 УВЕДОМЛЕНИЕ */}
      {notificationsAlert && (
        <div style={{
          background: "#fff3cd",
          padding: 12,
          borderRadius: 6,
          marginBottom: 12
        }}>
          🔔 Разрешите уведомления, чтобы получать входящие звонки
          <button
            style={{ marginLeft: 10 }}
            onClick={async () => {
              const { permission } = await requestNotificationPermission();
              if (permission === "granted") {
                setNotificationsAlert(false);
              }
            }}
          >
            Разрешить
          </button>
        </div>
      )}

      {!registered ? (
        <div>
          <h2>FamilyChat</h2>
          <input
            type="text"
            placeholder="Введите имя"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
          />
          <button onClick={register}>Войти</button>
          <input
            placeholder="+31..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div id="recaptcha-container"></div>
          <button onClick={sendCode}>
            Продолжить
          </button>

        </div>
      ) : (
        <div>
          <h3>Вы вошли как: {username}</h3>
          <h4>Онлайн: {onlineUsers.join(", ")}</h4>
          <VideoCall username={username} allUsers={allUsers} onlineUsers={onlineUsers} socket={socket} />
        </div>
      )}
    </div>
  );
}

export default App;
