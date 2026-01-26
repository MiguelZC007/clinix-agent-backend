module.exports = {
  apps: [
    {
      name: 'clinica-agent',
      script: 'pnpm run start:prod', 
      instances: 1, 
      exec_mode: 'fork', 
      watch: false, 
      autorestart: true, 
      max_memory_restart: '512M', 
    },
  ],
};