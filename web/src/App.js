import { useEffect, useState } from "react";
import socket from "./Socket";
import VideoCall from "./VideoCall";



function App() {
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [registered, setRegistered] = useState(false);
  const FAMILY_PASSWORD = "family-secret";

  // Слушаем сервер
  useEffect(() => {
    // Подписка на список пользователей
    socket.on("user_list", (users) => {
      // если username ещё не установлен, просто показываем всех
      console.log("⚡ получение user_list app.js");
      setOnlineUsers((prev) => {
        if (!username) return users;
        return users.filter((u) => u !== username);
      });
    });
  
    // Подтверждение регистрации
    socket.on("register_ok", ({ name }) => {

      setUsername(name);
      setRegistered(true);
      console.log("⚡ регистрация нового пользователя ", name);
      // после регистрации запросим актуальный список
      socket.emit("request_user_list");
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

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
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
        </div>
      ) : (
        <div>
          <h3>Вы вошли как: {username}</h3>
          <h4>Онлайн: {onlineUsers.join(", ")}</h4>
          <VideoCall username={username} onlineUsers={onlineUsers} socket={socket} />
        </div>
      )}
    </div>
  );
}

export default App;
