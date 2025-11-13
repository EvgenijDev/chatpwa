FamilyChat - minimal family messenger (chat first, video later)
============================================================

What's included:
- server/  - Node.js + Socket.IO server (serves the web build)
- web/     - React web client (PWA-ready)
- certs/   - (empty) place certs here if you want HTTPS from the Node server

How to deploy on your Timeweb VPS (basic):
1. Upload this project to the VPS (git clone or scp).
2. Install Node.js (v18+), npm.
3. In /web: run `npm install` and `npm run build`
4. In /server: run `npm install`
5. Set a secure family password:
   export FAMILY_PASSWORD="your-secret"
6. Start server:
   cd server
   npm start
7. (Recommended) Configure nginx as reverse proxy with HTTPS (Let's Encrypt) and proxy to localhost:3000. That way you have valid TLS for WebRTC / PWA on iPhone.

Notes:
- The template uses a single family password for simplicity.
- Video signaling placeholders exist; I'll help add full WebRTC when you're ready.
- If you want, I can produce step-by-step nginx + certbot configs for Timeweb.

Enjoy! 🎉
