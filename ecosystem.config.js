/**
 * PM2 ecosystem config for self-hosting Carent on a Raspberry Pi.
 *
 * This is intentionally separate from the currently running kono-bro app:
 * - different app name
 * - different working directory
 * - different internal port
 * - separate logs and DB path via environment variables
 */

module.exports = {
  apps: [
    {
      name: "carent",
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3002",
      cwd: "/opt/carent",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "500M",
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
      listen_timeout: 10000,
      kill_timeout: 10000,
      source_map_support: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "127.0.0.1",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
