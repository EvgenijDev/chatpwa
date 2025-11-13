Server notes
============

This is a minimal Node.js + Socket.IO server for the FamilyChat project.

Quick start (on the VPS):
1. Install Node.js (v18+ recommended).
2. Copy this project to your VPS.
3. In server/ folder, run:
   npm install
4. Configure environment:
   - export FAMILY_PASSWORD="your-secret-password"
   - export PORT=3000
5. For production, use a process manager (pm2 or systemd) or run behind nginx reverse proxy with HTTPS (recommended).
6. If you want the server to serve HTTPS directly, set USE_HTTPS=true in server.js and put certs in ../certs/key.pem and ../certs/cert.pem.
   Alternatively configure nginx to handle TLS and proxy to this server on localhost.

Notes:
- The server currently implements simple family-password registration and basic private messaging.
- WebRTC signaling placeholders exist (call_offer, call_answer, ice_candidate) but video isn't enabled in this template yet.
