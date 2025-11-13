import { useEffect, useRef, useState } from "react";

export default function VideoCall({ username, onlineUsers, socket }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const pc = useRef(null);
  const peerNameRef = useRef(null);

  const [callingTo, setCallingTo] = useState("");

  useEffect(() => {
    if (!username) return;

    console.log("🔧 Инициализация WebRTC для:", username);

    // создаём PeerConnection
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Лог состояния ICE
    pc.current.oniceconnectionstatechange = () => {
      console.log("🌐 ICE состояние:", pc.current.iceConnectionState);
    };

    // ICE кандидаты → пересылаем через socket.io
    pc.current.onicecandidate = (event) => {
      if (event.candidate && peerNameRef.current) {
        console.log("📤 Отправляю ICE кандидата →", peerNameRef.current);
        socket.emit("ice_candidate", {
          to: peerNameRef.current,
          candidate: event.candidate,
          from: username,
        });
      }
    };

    // Когда приходит поток от другого пользователя
    pc.current.ontrack = (event) => {
      console.log("🎥 Получен удалённый поток");
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = event.streams[0];
      }
    };

    // Подключаем локальную камеру
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!pc.current) return;
        if (localVideo.current) localVideo.current.srcObject = stream;
        stream.getTracks().forEach((track) => {
          console.log("🎙 Добавляю трек:", track.kind);
          pc.current.addTrack(track, stream);
        });
      })
      .catch((err) => {
        console.error("🚫 Ошибка доступа к камере:", err);
      });

    // === СИГНАЛИНГ ЧЕРЕЗ SOCKET.IO ===

    // 1️⃣ Входящий звонок
    socket.on("call_offer", async ({ from, offer }) => {
      console.log("📞 Входящий звонок от:", from);
      peerNameRef.current = from;

      await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.emit("call_answer", { to: from, answer, from: username });
    });

    // 2️⃣ Ответ на звонок
    socket.on("call_answer", async ({ from, answer }) => {
      console.log("✅ Ответ на звонок от:", from);
      await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // 3️⃣ Получение ICE кандидатов
    socket.on("ice_candidate", async ({ candidate }) => {
      try {
        await pc.current.addIceCandidate(candidate);
        console.log("🧊 Добавлен ICE кандидат");
      } catch (err) {
        console.error("Ошибка ICE:", err);
      }
    });

    // Очистка при размонтировании
    return () => {
      socket.off("call_offer");
      socket.off("call_answer");
      socket.off("ice_candidate");
      pc.current?.close();
    };
  }, [username, socket]);

  // Функция вызова
  const startCall = async (peerName) => {
    if (!peerName) return alert("Введите имя пользователя для звонка!");
    if (!pc.current) return alert("Соединение ещё не готово!");

    peerNameRef.current = peerName;

    console.log("📤 Отправляю offer →", peerName);
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);

    socket.emit("call_offer", { to: peerName, offer, from: username });
  };

  return (
    <div style={{ padding: 10 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <video
          ref={localVideo}
          autoPlay
          muted
          playsInline
          width="220"
          style={{ borderRadius: 10, background: "#000" }}
        />
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          width="220"
          style={{ borderRadius: 10, background: "#000" }}
        />
      </div>

      <div style={{ marginTop: 15 }}>
        <input
          type="text"
          placeholder="Имя для звонка"
          value={callingTo}
          onChange={(e) => setCallingTo(e.target.value)}
          list="users"
          style={{ marginRight: 10 }}
        />
        <datalist id="users">
          {onlineUsers.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <button onClick={() => startCall(callingTo)}>📞 Позвонить</button>
      </div>
    </div>
  );
}
