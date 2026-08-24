import 'dotenv/config';
import axios from 'axios';
import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';

const PARABANK_URL = process.env.BASE_URL;
const PARABANK_API_BASE = new URL('/parabank/services/bank', PARABANK_URL).toString().replace(/\/$/, '');
const CONTAINER_NAME = process.env.PARABANK_CONTAINER_NAME || 'parabank';

/**
 * Initialize Docker client with proper socket/host detection
 * Handles both WSL2 (Windows) and Linux installations
 */
function initializeDocker(): Docker {
  // Priority 1: Use DOCKER_HOST env var if set
  if (process.env.DOCKER_HOST) {
    console.log(`Using DOCKER_HOST: ${process.env.DOCKER_HOST}`);
    if (process.env.DOCKER_HOST.startsWith('unix://')) {
      // Unix socket path
      const socketPath = process.env.DOCKER_HOST.replace('unix://', '');
      return new Docker({ socketPath });
    } else if (process.env.DOCKER_HOST.includes('://')) {
      // TCP host
      const url = new URL(process.env.DOCKER_HOST);
      return new Docker({
        host: url.hostname,
        port: parseInt(url.port || '2375'),
      });
    }
  }

  // Priority 2: Platform-specific defaults
  if (process.platform === 'win32') {
    // Windows (WSL2) - use Windows interop paths to access WSL sockets
    // Try to detect WSL distro
    const wslDistros = ['Ubuntu', 'Debian', 'Ubuntu-20.04', 'Ubuntu-22.04'];
    const wslPaths = [];
    
    for (const distro of wslDistros) {
      wslPaths.push(`\\\\wsl$\\${distro}\\run\\docker.sock`);
      wslPaths.push(`\\\\wsl$\\${distro}\\var\\run\\docker.sock`);
    }
    
    for (const socketPath of wslPaths) {
      try {
        if (fs.existsSync(socketPath)) {
          console.log(`Found Docker socket at: ${socketPath}`);
          return new Docker({ socketPath });
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    
    console.warn('Could not find WSL2 Docker socket. Make sure Docker is running in WSL2.');
  } else {
    // Linux/Mac - use standard Unix socket paths
    const linuxPaths = [
      '/var/run/docker.sock',  // Standard Linux path
      '/run/docker.sock',      // Alternative Linux path
      '/Users/Shared/Docker.sock', // Mac
    ];
    
    for (const socketPath of linuxPaths) {
      if (fs.existsSync(socketPath)) {
        console.log(`Found Docker socket at: ${socketPath}`);
        return new Docker({ socketPath });
      }
    }
  }

  // Fallback: Use default connection (will attempt standard paths)
  console.log('Using default Docker connection method');
  return new Docker();
}

const docker = initializeDocker();

/**
 * Clean the ParaBank database
 */
async function cleanDatabase(): Promise<void> {
  try {
    console.log('Cleaning ParaBank database...');
    const response = await axios.post(`${PARABANK_API_BASE}/cleanDB`);
    console.log('✓ Database cleaned successfully');
  } catch (error) {
    console.error('Error cleaning database:', error);
    // Don't throw - continue with cleanup even if this fails
  }
}

/**
 * Stop and remove Docker container using dockerode
 */
async function stopContainer(): Promise<void> {
  try {
    const container = docker.getContainer(CONTAINER_NAME);
    
    // Check if container exists and is running
    const data = await container.inspect().catch(() => null);
    
    if (!data) {
      console.log(`Container ${CONTAINER_NAME} not found`);
      return;
    }
    
    if (data.State.Running) {
      console.log(`Stopping ${CONTAINER_NAME} container...`);
      await container.stop();
      console.log('✓ Container stopped');
    }
    
    console.log(`Removing ${CONTAINER_NAME} container...`);
    await container.remove();
    console.log('✓ Container removed');
  } catch (error) {
    console.warn('Warning: Could not stop/remove container:', error);
    // Don't throw - test completion shouldn't fail on cleanup issues
  }
}

/**
 * Global teardown - runs once after all tests
 */
async function globalTeardown() {
  console.log('\n=== GLOBAL TEARDOWN ===');
  
  // Clean the database
  await cleanDatabase();
  
  // Stop and destroy the container
  await stopContainer();
  
  console.log('=== GLOBAL TEARDOWN COMPLETE ===\n');
}

export default globalTeardown;
