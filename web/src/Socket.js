import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SERVER_URL || "https://chatpwa.ru", {
   transports: ["websocket"],
   path: "/socket.io" 
 });
 
export default socket;