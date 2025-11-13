Web client notes
================

This is a minimal React client (Create React App).

Quick start:
1. cd web
2. npm install
3. For development: REACT_APP_SERVER_URL=http://your-server:3000 npm start
4. For production build: npm run build
5. Copy the build/ directory to server/web/build or run build on the VPS.

PWA:
- manifest.json is included. After hosting on HTTPS, users (including iPhone Safari) can 'Add to Home Screen'.
