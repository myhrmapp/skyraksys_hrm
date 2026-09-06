const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Checks if a TCP port is open on a specific host.
 */
const checkPort = (host, port, timeout = 1000) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
};

async function run() {
  const dockerHost = 'db'; // Standard docker-compose service name
  const localHost = 'localhost';
  const port = process.env.DB_PORT || 5432;
  
  let targetHost = localHost;
  
  console.log(`\n🔍 Checking database availability for Test Environment...`);
  
  // Try Docker Postgres first
  const isDockerUp = await checkPort(dockerHost, port);
  
  if (isDockerUp) {
    console.log(`✅ Found Postgres on Docker network (${dockerHost}:${port})`);
    targetHost = dockerHost;
  } else {
    console.log(`⚠️ Docker Postgres not reachable. Falling back to local Postgres...`);
    // Try Local Postgres
    const isLocalUp = await checkPort(localHost, port);
    if (isLocalUp) {
        console.log(`✅ Found Postgres on Localhost (${localHost}:${port})`);
        targetHost = localHost;
    } else {
        console.log(`❌ CRITICAL: Neither Docker nor Local Postgres is available on port ${port}!`);
        console.log(`Tests will likely fail with a SequelizeConnectionRefusedError.\n`);
    }
  }
  
  // Set the environment variables for Jest
  process.env.DB_HOST = targetHost;
  process.env.NODE_ENV = 'test';
  
  const args = process.argv.slice(2);
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  
  console.log(`🚀 Launching Jest test suite against host: ${targetHost}...\n`);
  
  const child = spawn(cmd, ['jest', '--runInBand', ...args], {
    stdio: 'inherit',
    env: process.env,
    shell: true
  });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
}

run();
