import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import VideoCall from "./VideoCall";

// Один общий socket для всего приложения
const socket = io(process.env.REACT_APP_SERVER_URL || "https://chatpwa.ru", {
  transports: ["websocket"], // для надёжности
});

function App() {
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [registered, setRegistered] = useState(false);
  const FAMILY_PASSWORD = "family-secret";

  // Слушаем сервер
  useEffect(() => {
    socket.on("user_list", (users) => setOnlineUsers(users));

    socket.on("register_ok", ({ name }) => {
      setUsername(name);
      setRegistered(true);
    });

    socket.on("register_failed", ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off("user_list");
      socket.off("register_ok");
      socket.off("register_failed");
    };
  }, []);

  const register = () => {
    if (!inputName.trim()) return alert("Введите имя 49!");
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
