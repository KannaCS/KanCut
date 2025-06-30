/**
 * Type definitions for the KanCut application
 */

/**
 * Represents a network interface on the system
 */
export interface CustomNetworkInterface {
  name: string;
  description: string;
  mac: string;
  ips: string[];
}

/**
 * Represents a device discovered on the network
 */
export interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
}

/**
 * Represents an active spoofing session
 */
export interface SpoofingSession {
  id: string;
  target_ip: string;
  gateway_ip: string;
  interface: string;
  is_active: boolean;
  packets_sent: number;
} 