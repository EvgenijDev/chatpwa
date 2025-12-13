import { io } from "socket.io-client";

console.log('REACT_APP_SERVER_URL', process.env.REACT_APP_SERVER_URL);
const socket = io(process.env.REACT_APP_SERVER_URL || "https://chatpwa.ru", {
   transports: ["websocket"],
   path: "/socket.io" 
 });
 
export default socket;