// web/src/VideoCall.js
import React, { useEffect, useRef, useState } from "react";

/**
 * Props:
 * - username: string (твоё имя после регистрации)
 * - socket: socket.io client instance (передавай тот же socket из App.js)
 */
export default function VideoCall({ username, socket }) {
  const [users, setUsers] = useState([]);        // список других пользователей
  const [target, setTarget] = useState("");      // выбранный получатель
  const [incoming, setIncoming] = useState(null);// имя входящего звонка
  const [inCall, setInCall] = useState(false);   // флаг активного звонка
  const [status, setStatus] = useState("");      // отладочный статус

  const pcRef = useRef(null);                    // RTCPeerConnection
  const localStreamRef = useRef(null);           // MediaStream локальный
  const remoteStreamRef = useRef(null);          // MediaStream удалённый
  const pendingCandidates = useRef([]);          // буфер ICE до remoteDesc
  const pendingOffer = useRef(null);             // временно хранит offer при входящем звонке
  const peerNameRef = useRef(null);              // тек. собеседник

  const STUN_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  // --- Utility: создаёт PeerConnection (если ещё не создан) и навешивает обработчики ---
  const createPeerConnection = async () => {
    if (pcRef.current) return pcRef.current;

    setStatus("creating-pc");
    // const pc = new RTCPeerConnection(STUN_CONFIG);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: [
            "turn:dev.chatpwa.ru:3478?transport=udp",
            "turn:dev.chatpwa.ru:3478?transport=tcp", 
            "turns:dev.chatpwa.ru:5349?transport=tcp"
          ],
          username: Math.random().toString(36).substring(2, 15),
          credential: "MY_SECRET_KEY"
        }
      ]
    });

    
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      setStatus(`ice:${pc.iceConnectionState}`);
      console.log("ICE state:", pc.iceConnectionState);
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && peerNameRef.current) {
        // отправляем только candidate
        socket.emit("ice_candidate", {
          to: peerNameRef.current,
          candidate: ev.candidate,
          from: username,
        });
      }
    };

    pc.ontrack = (ev) => {
      console.log("ontrack -> got remote stream", ev.streams);
      // выставляем remote video
      if (remoteStreamRef.current === null || remoteStreamRef.current.id !== ev.streams[0].id) {
        remoteStreamRef.current = ev.streams[0];
        // try to set video element later via DOM refs (we use refs below)
        setStatus("remote-stream-received");
        // we don't store remote stream in state to avoid rerenders; we will set video.srcObject directly in render effect
      }
    };

    // Ensure local stream is available and added to pc
    try {
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
      }
      // add tracks to pc
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));
    } catch (err) {
      console.error("getUserMedia error", err);
      setStatus("media-error");
      throw err;
    }

    return pc;
  };

  // --- bufferized setRemote wrapper ---
  const setRemote = async (desc) => {
    if (!pcRef.current) throw new Error("pc not ready");
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(desc));
    // add pending candidates
    if (pendingCandidates.current.length) {
      for (const c of pendingCandidates.current) {
        try {
          await pcRef.current.addIceCandidate(c);
        } catch (e) {
          console.warn("addIceCandidate (from buffer) failed", e);
        }
      }
      pendingCandidates.current = [];
    }
  };

  // --- start outgoing call ---
  const startCall = async () => {
    if (!target) return alert("Выберите получателя");
    if (!username) return alert("Сначала зарегистрируйтесь");

    try {
      peerNameRef.current = target;
      setStatus("starting-call");
      const pc = await createPeerConnection(); // создаём и инициализируем pc + локальный поток

      // Если были старые кандидаты — очистим буфер
      pendingCandidates.current = [];

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // отправляем только локальное описание (offer) и имя
      socket.emit("call_offer", { to: target, offer: pc.localDescription, from: username });

      setInCall(true);
      setStatus("offer-sent");
    } catch (err) {
      console.error("startCall error", err);
      setStatus("start-error");
    }
  };

  // --- accept incoming call ---
  const acceptCall = async () => {
    if (!pendingOffer.current) return;
    try {
      setStatus("accepting");
      await createPeerConnection(); // создаём pc и добавляем локальные треки если нужно

      // Устанавливаем remote (offer) и дождёмся добавления буфера
      await setRemote(pendingOffer.current);

      // Создаём answer
      const pc = pcRef.current;
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Отправляем answer
      socket.emit("call_answer", { to: peerNameRef.current, answer: pc.localDescription, from: username });

      pendingOffer.current = null;
      setIncoming(null);
      setInCall(true);
      setStatus("answered");
    } catch (err) {
      console.error("acceptCall error", err);
      setStatus("accept-error");
    }
  };

  // --- decline incoming (before accept) ---
  const declineCall = () => {
    pendingOffer.current = null;
    setIncoming(null);
    peerNameRef.current = null;
    setStatus("declined");
  };

  // --- fully end call (close pc, stop streams) ---
  const endCall = () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current = null;
      }
    } catch (e) {
      console.warn("endCall stream stop error", e);
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        console.warn("pc close error", e);
      }
      pcRef.current = null;
    }

    pendingCandidates.current = [];
    pendingOffer.current = null;
    peerNameRef.current = null;
    setInCall(false);
    setIncoming(null);
    setStatus("ended");
  };

  // --- handle socket events ---
  useEffect(() => {
    if (!socket) return;

    const onUserList = (list) => {
      // exclude self if username known
      if (username) setUsers(list.filter((u) => u !== username));
      else setUsers(list);
      console.log("user_list", list);
    };

    const onCallOffer = ({ from, offer }) => {
      console.log("call_offer from", from);
      // store offer and notify UI
      peerNameRef.current = from;
      pendingOffer.current = offer;
      setIncoming(from);
      setStatus("incoming");
    };

    const onCallAnswer = async ({ from, answer }) => {
      console.log("call_answer from", from);
      try {
        if (!pcRef.current) {
          console.warn("Received answer but pc is null");
          return;
        }
        // Use setRemote wrapper (it will also flush pending candidates)
        await setRemote(answer);
        setStatus("connected");
      } catch (err) {
        console.error("onCallAnswer error", err);
      }
    };

    const onIceCandidate = ({ from, candidate }) => {
      // If remoteDescription not set yet - buffer it
      if (!pcRef.current || !pcRef.current.remoteDescription || !pcRef.current.remoteDescription.type) {
        pendingCandidates.current.push(candidate);
        console.log("buffering candidate (no remoteDesc yet)");
        return;
      }
      pcRef.current.addIceCandidate(candidate).catch((e) => {
        console.warn("addIceCandidate failed", e);
      });
    };

    socket.on("user_list", onUserList);
    socket.on("call_offer", onCallOffer);
    socket.on("call_answer", onCallAnswer);
    socket.on("ice_candidate", onIceCandidate);

    // request initial list
    socket.emit("request_user_list");

    return () => {
      socket.off("user_list", onUserList);
      socket.off("call_offer", onCallOffer);
      socket.off("call_answer", onCallAnswer);
      socket.off("ice_candidate", onIceCandidate);
    };

  }, [socket, username]);

  // --- attach streams to DOM video elements when they change ---
  const localVideoRef = useRef(null);
  const remoteVideoElRef = useRef(null);

  useEffect(() => {
    // set local stream onto element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current || null;
    }
  }, [localStreamRef.current]);

  useEffect(() => {
    if (remoteVideoElRef.current) {
      remoteVideoElRef.current.srcObject = remoteStreamRef.current || null;
    }
  }, [remoteStreamRef.current]);

  // cleanup on component unmount
  useEffect(() => {
    const onBeforeUnload = () => endCall();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      endCall();
    };
    // eslint-disable-next-line
  }, []);

  // --- UI render ---
  return (
    <div style={{ padding: 12, fontFamily: "sans-serif" }}>
      <h3>Видео-звонки ({username || "не в системе"})</h3>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Локальное</div>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: 240, height: 180, background: "#000" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Собеседник</div>
          <video
            ref={remoteVideoElRef}
            autoPlay
            playsInline
            style={{ width: 240, height: 180, background: "#000" }}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {!inCall && !incoming && (
          <>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">— Выберите получателя —</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button onClick={startCall} style={{ marginLeft: 8 }}>
              📞 Позвонить
            </button>
          </>
        )}

        {incoming && !inCall && (
          <div style={{ marginTop: 8, background: "#fff4cc", padding: 8 }}>
            <div>📞 Входящий звонок от: {incoming}</div>
            <button onClick={acceptCall} style={{ marginRight: 8 }}>
              ✅ Ответить
            </button>
            <button
              onClick={() => {
                declineCall();
                // optionally notify caller about decline:
                socket.emit("call_decline", { to: peerNameRef.current });
              }}
            >
              ❌ Отклонить
            </button>
          </div>
        )}

        {inCall && (
          <div style={{ marginTop: 8 }}>
            <div>В звонке с: {peerNameRef.current}</div>
            <button
              onClick={() => {
                // notify remote we ended (optional)
                socket.emit("call_end", { to: peerNameRef.current });
                endCall();
              }}
              style={{ background: "#e85d5d", color: "#fff", padding: "6px 10px", border: "none" }}
            >
              ❌ Завершить звонок
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        <div>Статус: {status}</div>
      </div>
    </div>
  );
}
