module.exports = {
  apps: [
    {
      name: 'skyraksys-hrm',
      script: 'server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      node_args: ['--max_old_space_size=1024']
    }
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: '46.225.73.94',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/skyraksys_hrm.git',
      path: '/var/www/skyraksys_hrm',
      'post-deploy': 'cd backend && npm ci --production && cd ../frontend && npm ci && npm run build && cd .. && pm2 reload ecosystem.config.js --env production'
    }
  }
};
