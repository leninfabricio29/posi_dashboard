// PM2: `pm2 start ecosystem.config.js` (después de `npm run build`).
// NEXT_PUBLIC_API_BASE se fija al compilar: debe estar en .env.production ANTES de `npm run build`.
// Cambia el puerto si 3010 ya lo usa otra app del servidor.
module.exports = {
  apps: [
    {
      name: 'posi-dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3010',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
      time: true,
    },
  ],
};
