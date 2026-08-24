import 'dotenv/config';
import axios from 'axios';
import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';
import process from 'process';

function ensureRequiredEnv(): void {
  const required = {
    BASE_URL: process.env.BASE_URL,
    PARABANK_IMAGE: process.env.PARABANK_IMAGE || 'parasoft/parabank',
    PARABANK_CONTAINER_NAME: process.env.PARABANK_CONTAINER_NAME || 'parabank',
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

ensureRequiredEnv();

const PARABANK_URL = process.env.BASE_URL;
const PARABANK_IMAGE = process.env.PARABANK_IMAGE || 'parasoft/parabank';
const CONTAINER_NAME = process.env.PARABANK_CONTAINER_NAME || 'parabank';

function getParaBankApiBase(baseUrl: string | undefined): string {
  if (!baseUrl) {
    throw new Error('BASE_URL is not defined. Check your environment configuration.');
  }

  try {
    return `${new URL(baseUrl).origin}/parabank/services/bank`;
  } catch {
    throw new Error(`BASE_URL must be an absolute URL. Received: ${baseUrl}`);
  }
}

const PARABANK_API_BASE = getParaBankApiBase(PARABANK_URL);

/**
 * Initialize Docker client with proper socket/host detection
 * Handles both WSL2 (Windows) and Linux installations
 */
function initializeDocker(): Docker {
  // Priority 1: Use DOCKER_HOST env var if set
  if (process.env.DOCKER_HOST) {
    const host = process.env.DOCKER_HOST;
    console.log(`Using DOCKER_HOST: ${host}`);
    
    if (host.startsWith('unix://')) {
      // Unix socket path
      const socketPath = host.replace('unix://', '');
      return new Docker({ socketPath });
    }
    
    if (host.startsWith('npipe://')) {
      // Windows named pipe
      return new Docker({ socketPath: host });
    }
    
    if (host.includes('://')) {
      // TCP host
      const url = new URL(host);
      return new Docker({ host: '172.26.24.55', port: 2375 });
    //   return new Docker({
    //     host: url.hostname,
    //     port: parseInt(url.port || '2375', 10),
    //   });
    }
  }

  // Priority 2: Platform-specific defaults
  if (process.platform === 'win32') {
    // Windows (WSL2) - try named pipe first
    // const windowsPipe = '//./pipe/docker_engine';
    // console.log(`Windows detected. Trying named pipe: ${windowsPipe}`);
    return new Docker({ host: '172.26.24.55', port: 2375 }); // Adjust to your WSL2 Docker host IP and port
  }

  // Priority 3: Linux / macOS Unix Sockets
  const linuxPaths = [
    '/var/run/docker.sock',
    '/run/docker.sock',
    `${process.env.HOME}/.docker/run/docker.sock`, // Rootless / Docker Desktop on Mac/Linux
  ];

  for (const socketPath of linuxPaths) {
    if (socketPath && fs.existsSync(socketPath)) {
      console.log(`Found Docker socket at: ${socketPath}`);
      return new Docker({ socketPath });
    }
  }

  // Fallback to Dockerode defaults
  console.log('Using default Docker connection fallback');
  return new Docker();
}

const docker = initializeDocker();

/**
 * Check if Docker container is running using dockerode
 */
async function isContainerRunning(): Promise<boolean> {
  try {
    const container = docker.getContainer(CONTAINER_NAME);
    const data = await container.inspect();
    return data.State.Running;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Cannot connect to Docker daemon!');
      console.error('Please ensure Docker is running. If using WSL2, you may need to set:');
      console.error('  export DOCKER_HOST=unix://$HOME/.docker/desktop/docker.sock');
      console.error('Or ensure the Docker socket is accessible at:');
      console.error('  ~/.docker/desktop/docker.sock\n');
    }
    console.error('Error checking container status:', error.message);
    return false;
  }
}

/**
 * Initialize the ParaBank database
 */
async function initializeDatabase(): Promise<void> {
  try {
    console.log('Initializing ParaBank database...');
    const response = await axios.post(`${PARABANK_API_BASE}/initializeDB`);
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Pull the latest ParaBank image
 */
async function pullImage(): Promise<void> {
  try {
    console.log(`Pulling latest ParaBank image: ${PARABANK_IMAGE}...`);
    const stream = await docker.pull(PARABANK_IMAGE);
    
    // Wait for pull to complete
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
    
    console.log('✓ Image pulled successfully');
  } catch (error) {
    console.error('Error pulling image:', error);
    throw error;
  }
}

/**
 * Start the ParaBank container
 */
async function startContainer(): Promise<void> {
  try {
    console.log(`Starting ${CONTAINER_NAME} container from image ${PARABANK_IMAGE}...`);
    const container = await docker.createContainer({
      Image: PARABANK_IMAGE,
      name: CONTAINER_NAME,
      ExposedPorts: {
        '8080/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '8080/tcp': [{ HostPort: '8080' }],
        },
      },
    });
    
    await container.start();
    console.log('✓ Container started successfully');
  } catch (error) {
    console.error('Error starting container:', error);
    throw error;
  }
}

/**
 * Wait for ParaBank to be available
 */
async function waitForParaBankReady(maxAttempts: number = 90): Promise<void> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      await axios.get(`${PARABANK_URL}/index.htm`);
      console.log('✓ ParaBank is ready');
      return;
    } catch (error) {
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`Waiting for ParaBank... (attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw new Error('ParaBank failed to start within timeout');
}

/**
 * Global setup - runs once before all tests
 */
async function globalSetup() {
  console.log('\n=== GLOBAL SETUP ===');
  
  // Check if container is running
  console.log(`Checking if ${CONTAINER_NAME} container is running...`);
  let isRunning = await isContainerRunning();
  
  if (!isRunning) {
    console.log(`Container not running. Pulling image and starting...`);
    
    // Try to remove existing container if it exists
    try {
      const container = docker.getContainer(CONTAINER_NAME);
      await container.remove();
      console.log('✓ Removed existing container');
    } catch (error) {
      // Container doesn't exist, that's fine
    }
    
    // Pull the latest image
    await pullImage();
    
    // Start the container
    await startContainer();
  }
  
  console.log(`✓ ${CONTAINER_NAME} container is running`);
  
  // Wait for ParaBank to be ready
  await waitForParaBankReady();
  
  // Initialize the database
  await initializeDatabase();
  
  console.log('=== GLOBAL SETUP COMPLETE ===\n');
}

export default globalSetup;
