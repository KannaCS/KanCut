/**
 * API utility for the KanCut application frontend
 */

import { invoke } from '@tauri-apps/api/tauri';
import { logger, debug, info, error } from './logger';
import { handleError, createNetworkError, AppError } from './errorHandler';
import type { CustomNetworkInterface, NetworkDevice, SpoofingSession } from '../types';

/**
 * Get all network interfaces
 */
export async function getInterfaces(): Promise<CustomNetworkInterface[]> {
  info('API: Getting network interfaces');
  
  try {
    const interfaces = await invoke<CustomNetworkInterface[]>('get_interfaces');
    debug(`API: Found ${interfaces.length} network interfaces`);
    return interfaces;
  } catch (err) {
    const appError = handleError(err);
    error(`API: Failed to get network interfaces`, appError);
    throw appError;
  }
}

/**
 * Scan the network for devices
 */
export async function scanNetwork(interfaceName: string): Promise<NetworkDevice[]> {
  info(`API: Scanning network on interface: ${interfaceName}`);
  
  try {
    const devices = await invoke<NetworkDevice[]>('scan_network', {
      interfaceName
    });
    debug(`API: Found ${devices.length} devices on network`);
    return devices;
  } catch (err) {
    const appError = handleError(err);
    error(`API: Failed to scan network on interface ${interfaceName}`, appError);
    throw appError;
  }
}

/**
 * Start spoofing a specific device
 */
export async function startSpoofing(
  targetIp: string,
  gatewayIp: string,
  interfaceName: string
): Promise<string> {
  info(`API: Starting spoofing - Target: ${targetIp}, Gateway: ${gatewayIp}, Interface: ${interfaceName}`);
  
  try {
    const sessionId = await invoke<string>('start_spoofing', {
      targetIp,
      gatewayIp,
      interfaceName
    });
    info(`API: Spoofing started with session ID: ${sessionId}`);
    return sessionId;
  } catch (err) {
    const appError = handleError(err);
    error(`API: Failed to start spoofing for ${targetIp}`, appError);
    throw appError;
  }
}

/**
 * Stop spoofing a specific session
 */
export async function stopSpoofing(sessionId: string): Promise<boolean> {
  info(`API: Stopping spoofing session: ${sessionId}`);
  
  try {
    const result = await invoke<boolean>('stop_spoofing', {
      sessionId
    });
    info(`API: Spoofing session ${sessionId} stopped: ${result}`);
    return result;
  } catch (err) {
    const appError = handleError(err);
    error(`API: Failed to stop spoofing session ${sessionId}`, appError);
    throw appError;
  }
}

/**
 * Get all active spoofing sessions
 */
export async function getActiveSessions(): Promise<SpoofingSession[]> {
  debug('API: Getting active spoofing sessions');
  
  try {
    const sessions = await invoke<SpoofingSession[]>('get_active_sessions');
    debug(`API: Found ${sessions.length} active sessions`);
    return sessions;
  } catch (err) {
    const appError = handleError(err);
    error('API: Failed to get active sessions', appError);
    throw appError;
  }
}

/**
 * Start spoofing for all devices in the network
 */
export async function startSpoofAll(
  devices: NetworkDevice[],
  gatewayIp: string,
  interfaceName: string
): Promise<string[]> {
  info(`API: Starting spoofing for all ${devices.length} devices on interface ${interfaceName}`);
  
  try {
    const sessionIds = await invoke<string[]>('start_spoof_all', {
      devices,
      gatewayIp,
      interfaceName
    });
    info(`API: Started spoofing for ${sessionIds.length} devices`);
    return sessionIds;
  } catch (err) {
    const appError = handleError(err);
    error('API: Failed to start spoofing for all devices', appError);
    throw appError;
  }
}

/**
 * Check if the application has sufficient permissions
 */
export async function checkPermissions(): Promise<boolean> {
  debug('API: Checking application permissions');
  
  try {
    // We can use getInterfaces as a proxy to check if we have sufficient permissions
    await getInterfaces();
    return true;
  } catch (err) {
    // If the error is permission-related, handle it specifically
    const appError = handleError(err);
    if (appError.message.toLowerCase().includes('permission') || 
        appError.message.toLowerCase().includes('access denied') ||
        appError.message.toLowerCase().includes('administrator')) {
      error('API: Insufficient permissions to access network interfaces', appError);
      return false;
    }
    
    // For other errors, we might still have permissions but something else failed
    return true;
  }
} 