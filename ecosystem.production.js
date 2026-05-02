module.exports = {
  apps: [
    {
      name: 'alumnet-server',
      cwd: '/path/to/alumnet/server',
      script: 'dist/app.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/path/to/alumnet/logs/server-error.log',
      out_file: '/path/to/alumnet/logs/server-out.log',
      merge_logs: true,
    },
  ],
};