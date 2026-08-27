import axios from 'axios';
import Docker from 'dockerode';
import * as fs from 'fs';
import process from 'process';
import { appConfig } from './config.ts';

const PARABANK_URL = process.env.BASE_URL || appConfig.baseUrl;;
const PARABANK_IMAGE = process.env.PARABANK_IMAGE || appConfig.parabankImage;
const CONTAINER_NAME = process.env.PARABANK_CONTAINER_NAME || appConfig.containerName;

function ensureRequiredEnv(): void {
  const required = {
    BASE_URL: PARABANK_URL,
    PARABANK_IMAGE: PARABANK_IMAGE || 'parasoft/parabank',
    PARABANK_CONTAINER_NAME: CONTAINER_NAME || 'parabank',
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

ensureRequiredEnv();


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
  const isWsl = process.platform !== 'win32' && fs.existsSync('/proc/version') && fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');

  // Priority 1: respect an explicit Docker host override if the developer configured one.
  if (process.env.DOCKER_HOST) {
    const host = process.env.DOCKER_HOST.trim();

    if (process.platform !== 'win32' && host.startsWith('npipe://')) {
      console.log(`Ignoring Windows Docker pipe DOCKER_HOST on non-Windows environment: ${host}`);
    } else {
      console.log(`Using DOCKER_HOST: ${host}`);

      if (host.startsWith('unix://')) {
        const socketPath = host.replace('unix://', '');
        return new Docker({ socketPath });
      }

      if (host.startsWith('npipe://')) {
        return new Docker({ socketPath: host });
      }

      if (host.includes('://')) {
        const url = new URL(host);
        return new Docker({ host: url.hostname, port: Number(url.port || 2375) });
      }
    }
  }

  // Priority 2: prefer the standard Unix socket used by Docker Engine on Linux and WSL2.
  const linuxSocketPaths = [
    '/var/run/docker.sock',
    '/run/docker.sock',
    `${process.env.HOME}/.docker/run/docker.sock`,
    `${process.env.HOME}/.docker/desktop/docker.sock`,
  ];

  for (const socketPath of linuxSocketPaths) {
    if (socketPath && fs.existsSync(socketPath)) {
      console.log(`Found Docker socket at: ${socketPath}`);
      return new Docker({ socketPath });
    }
  }

  // Priority 3: Windows fallback only if a native Windows Docker engine is present.
  if (process.platform === 'win32') {
    const windowsPipe = '//./pipe/docker_engine';
    if (fs.existsSync(windowsPipe.replace(/\//g, '\\'))) {
      console.log(`Using Windows Docker named pipe: ${windowsPipe}`);
      return new Docker({ socketPath: windowsPipe });
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
      const appUrl = new URL('/parabank/index.htm', PARABANK_URL).toString();
      await axios.get(appUrl);
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
