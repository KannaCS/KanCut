import { invoke } from "@tauri-apps/api/core";

// Types
interface NetworkInterface {
  name: string;
  description: string;
  mac: string;
  ips: string[];
}

interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
}

interface SpoofingSession {
  id: string;
  target_ip: string;
  gateway_ip: string;
  interface: string;
  is_active: boolean;
  packets_sent: number;
}

// Global state
let selectedInterface: NetworkInterface | null = null;
let selectedDevice: NetworkDevice | null = null;
let activeSessions: SpoofingSession[] = [];
let sessionUpdateInterval: number | null = null;

// DOM elements
let disclaimerModal: HTMLElement;
let appContainer: HTMLElement;
let loadingOverlay: HTMLElement;
let loadingText: HTMLElement;
let interfaceGrid: HTMLElement;
let scanSection: HTMLElement;
let spoofingSection: HTMLElement;
let devicesGrid: HTMLElement;
let devicesHeader: HTMLElement;
let sessionsContainer: HTMLElement;
let sessionsGrid: HTMLElement;
let statusIndicator: HTMLElement;
let statusText: HTMLElement;
let interfaceName: HTMLElement;

// Initialize the application
window.addEventListener("DOMContentLoaded", () => {
  initializeElements();
  setupEventListeners();
  showDisclaimer();
});

function initializeElements() {
  disclaimerModal = document.getElementById("disclaimer-modal")!;
  appContainer = document.getElementById("app")!;
  loadingOverlay = document.getElementById("loading-overlay")!;
  loadingText = document.getElementById("loading-text")!;
  interfaceGrid = document.getElementById("interface-grid")!;
  scanSection = document.getElementById("scan-section")!;
  spoofingSection = document.getElementById("spoofing-section")!;
  devicesGrid = document.getElementById("devices-grid")!;
  devicesHeader = document.getElementById("devices-header")!;
  sessionsContainer = document.getElementById("sessions-container")!;
  sessionsGrid = document.getElementById("sessions-grid")!;
  statusIndicator = document.getElementById("status-indicator")!;
  statusText = document.getElementById("status-text")!;
  interfaceName = document.getElementById("interface-name")!;
}

function setupEventListeners() {
  // Disclaimer modal
  document.getElementById("accept-disclaimer")?.addEventListener("click", acceptDisclaimer);
  document.getElementById("decline-disclaimer")?.addEventListener("click", declineDisclaimer);
  
  // Header actions
  document.getElementById("refresh-btn")?.addEventListener("click", refreshInterfaces);
  
  // Scan controls
  document.getElementById("scan-btn")?.addEventListener("click", scanNetwork);
  
  // Spoof all button
  document.getElementById("spoof-all-btn")?.addEventListener("click", startSpoofAll);
  
  // Spoofing controls
  document.getElementById("start-spoofing-btn")?.addEventListener("click", startSpoofing);
  document.getElementById("stop-spoofing-btn")?.addEventListener("click", stopSpoofing);
}

function showDisclaimer() {
  disclaimerModal.classList.add("active");
  appContainer.style.filter = "blur(5px)";
}

function acceptDisclaimer() {
  disclaimerModal.classList.remove("active");
  appContainer.style.filter = "none";
  setTimeout(() => {
    loadNetworkInterfaces();
  }, 300);
}

function declineDisclaimer() {
  // In a real app, this would close the application
  alert("Application will now close.");
}

async function loadNetworkInterfaces() {
  try {
    showLoading("Loading network interfaces...");
    updateStatus("loading", "Loading interfaces...");
    
    console.log("Calling get_interfaces...");
    const interfaces: NetworkInterface[] = await invoke("get_interfaces");
    console.log("Interfaces received:", interfaces);
    displayInterfaces(interfaces);
    
    updateStatus("ready", "Ready");
  } catch (error) {
    console.error("Failed to load interfaces:", error);
    updateStatus("error", "Failed to load interfaces");
    showError("Failed to load network interfaces: " + error);
  } finally {
    hideLoading();
  }
}

function displayInterfaces(interfaces: NetworkInterface[]) {
  interfaceGrid.innerHTML = "";
  
  if (interfaces.length === 0) {
    interfaceGrid.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-exclamation-triangle"></i>
        <p>No network interfaces found</p>
      </div>
    `;
    return;
  }
  
  interfaces.forEach((iface, index) => {
    const card = document.createElement("div");
    card.className = "interface-card";
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
      <div class="interface-header">
        <i class="fas fa-network-wired interface-icon"></i>
        <div class="interface-name">${iface.name}</div>
      </div>
      <div class="interface-description">${iface.description || "No description"}</div>
      <div class="interface-details">
        <div class="interface-detail">
          <span class="interface-detail-label">MAC Address:</span>
          <span class="interface-detail-value">${iface.mac || "N/A"}</span>
        </div>
        <div class="interface-detail">
          <span class="interface-detail-label">IP Addresses:</span>
          <span class="interface-detail-value">${iface.ips.join(", ") || "N/A"}</span>
        </div>
      </div>
    `;
    
    card.addEventListener("click", () => selectInterface(iface, card));
    interfaceGrid.appendChild(card);
  });
}

function selectInterface(iface: NetworkInterface, cardElement: HTMLElement) {
  // Remove previous selection
  document.querySelectorAll(".interface-card").forEach(card => {
    card.classList.remove("selected");
  });
  
  // Select new interface
  cardElement.classList.add("selected");
  selectedInterface = iface;
  
  // Update status
  updateStatus("ready", "Interface selected");
  interfaceName.textContent = iface.name;
  
  // First make sure the element is visible and not animated
  scanSection.classList.remove("slide-in-right");
  scanSection.style.display = "block";
  
  // Add the visible class to ensure it stays visible
  scanSection.classList.add("visible");
  
  // Force a reflow to ensure the browser recognizes the style changes
  void scanSection.offsetWidth;
  
  // Add the animation class
  scanSection.classList.add("slide-in-right");
  
  // No need to auto-populate network range since it's automatically detected
}

async function scanNetwork() {
  if (!selectedInterface) {
    showError("Please select a network interface first");
    return;
  }
  
  try {
    showLoading("Scanning network...");
    updateStatus("loading", "Scanning network...");
    
    console.log("Calling scan_network with:", { interfaceName: selectedInterface.name });
    const devices: NetworkDevice[] = await invoke("scan_network", {
      interfaceName: selectedInterface.name
    });
    console.log("Devices received:", devices);
    
    displayDevices(devices);
    updateStatus("ready", "Scan completed");
  } catch (error) {
    console.error("Network scan failed:", error);
    updateStatus("error", "Scan failed");
    showError("Network scan failed: " + error);
  } finally {
    hideLoading();
  }
}

function displayDevices(devices: NetworkDevice[]) {
  devicesGrid.innerHTML = "";
  
  if (devices.length === 0) {
    devicesGrid.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-search"></i>
        <p>No devices found</p>
      </div>
    `;
    devicesHeader.style.display = "none";
    return;
  }
  
  // Show devices header with spoof all button
  devicesHeader.style.display = "flex";
  
  devices.forEach((device, index) => {
    const card = document.createElement("div");
    card.className = "device-card";
    card.style.animationDelay = `${index * 0.1}s`;
    
    const isRouter = device.ip.endsWith(".1") || device.hostname.toLowerCase().includes("router");
    const icon = isRouter ? "fa-router" : "fa-desktop";
    
    card.innerHTML = `
      <div class="device-header">
        <i class="fas ${icon} device-icon"></i>
        <div class="device-ip">${device.ip}</div>
      </div>
      <div class="device-details">
        <div class="device-detail">
          <span class="device-detail-label">MAC:</span>
          <span class="device-detail-value">${device.mac}</span>
        </div>
        <div class="device-detail">
          <span class="device-detail-label">Hostname:</span>
          <span class="device-detail-value">${device.hostname}</span>
        </div>
        <div class="device-detail">
          <span class="device-detail-label">Vendor:</span>
          <span class="device-detail-value">${device.vendor}</span>
        </div>
      </div>
    `;
    
    card.addEventListener("click", () => selectDevice(device, card));
    devicesGrid.appendChild(card);
  });
}

function selectDevice(device: NetworkDevice, cardElement: HTMLElement) {
  // Remove previous selection
  document.querySelectorAll(".device-card").forEach(card => {
    card.classList.remove("selected");
  });
  
  // Select new device
  cardElement.classList.add("selected");
  selectedDevice = device;
  
  // Update spoofing section
  const targetIpInput = document.getElementById("target-ip") as HTMLInputElement;
  targetIpInput.value = device.ip;
  
  // Show spoofing section
  spoofingSection.classList.remove("slide-in-right");
  spoofingSection.style.display = "block";
  spoofingSection.classList.add("visible");
  
  // Force a reflow
  void spoofingSection.offsetWidth;
  
  // Add animation
  spoofingSection.classList.add("slide-in-right");
  
  updateStatus("ready", "Target selected");
}

async function startSpoofing() {
  if (!selectedInterface || !selectedDevice) {
    showError("Please select an interface and target device first");
    return;
  }
  
  const gatewayIpInput = document.getElementById("gateway-ip") as HTMLInputElement;
  const gatewayIp = gatewayIpInput.value.trim();
  
  if (!gatewayIp) {
    showError("Please enter the gateway IP address");
    return;
  }
  
  try {
    showLoading("Starting ARP spoofing...");
    updateStatus("loading", "Starting spoofing...");
    
    console.log("Calling start_spoofing with:", {
      targetIp: selectedDevice.ip,
      gatewayIp,
      interfaceName: selectedInterface.name
    });
    
    const sessionId: string = await invoke("start_spoofing", {
      targetIp: selectedDevice.ip,
      gatewayIp: gatewayIp,
      interfaceName: selectedInterface.name
    });
    
    console.log("Spoofing started, session ID:", sessionId);
    
    // Update UI
    document.getElementById("start-spoofing-btn")!.style.display = "none";
    document.getElementById("stop-spoofing-btn")!.style.display = "inline-flex";
    
    // Show sessions container
    sessionsContainer.classList.remove("slide-in-right");
    sessionsContainer.style.display = "block";
    sessionsContainer.classList.add("visible");
    
    // Force a reflow
    void sessionsContainer.offsetWidth;
    
    // Add animation
    sessionsContainer.classList.add("slide-in-right");
    
    // Start session monitoring
    startSessionMonitoring();
    
    updateStatus("active", "ARP spoofing active");
    showSuccess("ARP spoofing started successfully");
  } catch (error) {
    console.error("Failed to start spoofing:", error);
    updateStatus("error", "Failed to start spoofing");
    showError("Failed to start ARP spoofing: " + error);
  } finally {
    hideLoading();
  }
}

async function stopSpoofing() {
  try {
    showLoading("Stopping ARP spoofing...");
    updateStatus("loading", "Stopping spoofing...");
    
    console.log("Stopping all active sessions");
    
    // Stop all active sessions
    for (const session of activeSessions) {
      if (session.is_active) {
        console.log("Stopping session:", session.id);
        await invoke("stop_spoofing", { sessionId: session.id });
      }
    }
    
    // Update UI
    document.getElementById("start-spoofing-btn")!.style.display = "inline-flex";
    document.getElementById("stop-spoofing-btn")!.style.display = "none";
    
    // Stop session monitoring
    stopSessionMonitoring();
    
    updateStatus("ready", "ARP spoofing stopped");
    showSuccess("ARP spoofing stopped successfully");
  } catch (error) {
    console.error("Failed to stop spoofing:", error);
    updateStatus("error", "Failed to stop spoofing");
    showError("Failed to stop ARP spoofing: " + error);
  } finally {
    hideLoading();
  }
}

function startSessionMonitoring() {
  if (sessionUpdateInterval) {
    clearInterval(sessionUpdateInterval);
  }
  
  sessionUpdateInterval = window.setInterval(updateSessions, 2000);
  updateSessions(); // Initial update
}

function stopSessionMonitoring() {
  if (sessionUpdateInterval) {
    clearInterval(sessionUpdateInterval);
    sessionUpdateInterval = null;
  }
}

async function updateSessions() {
  try {
    console.log("Fetching active sessions...");
    const sessions: SpoofingSession[] = await invoke("get_active_sessions");
    console.log("Sessions received:", sessions);
    
    activeSessions = sessions;
    displaySessions(sessions);
  } catch (error) {
    console.error("Failed to update sessions:", error);
  }
}

function displaySessions(sessions: SpoofingSession[]) {
  sessionsGrid.innerHTML = "";
  
  if (sessions.length === 0) {
    sessionsGrid.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-info-circle"></i>
        <p>No active sessions</p>
      </div>
    `;
    return;
  }
  
  sessions.forEach((session, index) => {
    const card = document.createElement("div");
    card.className = `session-card ${session.is_active ? "active" : ""}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
      <div class="session-header">
        <div class="session-status ${session.is_active ? "active" : "inactive"}">
          <div class="status-dot"></div>
          ${session.is_active ? "Active" : "Inactive"}
        </div>
        <button class="btn btn-danger btn-sm" onclick="stopSession('${session.id}')">
          <i class="fas fa-stop"></i>
        </button>
      </div>
      <div class="session-details">
        <div class="session-detail">
          <span class="session-detail-label">Target:</span>
          <span class="session-detail-value">${session.target_ip}</span>
        </div>
        <div class="session-detail">
          <span class="session-detail-label">Gateway:</span>
          <span class="session-detail-value">${session.gateway_ip}</span>
        </div>
        <div class="session-detail">
          <span class="session-detail-label">Interface:</span>
          <span class="session-detail-value">${session.interface}</span>
        </div>
        <div class="session-detail">
          <span class="session-detail-label">Packets Sent:</span>
          <span class="session-detail-value">${session.packets_sent.toLocaleString()}</span>
        </div>
      </div>
    `;
    
    sessionsGrid.appendChild(card);
  });
}

// Global function for stopping individual sessions
(window as any).stopSession = async (sessionId: string) => {
  try {
    console.log("Stopping session:", sessionId);
    await invoke("stop_spoofing", { sessionId });
    showSuccess("Session stopped successfully");
  } catch (error) {
    console.error("Failed to stop session:", error);
    showError("Failed to stop session: " + error);
  }
};

function refreshInterfaces() {
  // Reset state
  selectedInterface = null;
  selectedDevice = null;
  activeSessions = [];
  
  // Hide sections
  scanSection.style.display = "none";
  spoofingSection.style.display = "none";
  sessionsContainer.style.display = "none";
  
  // Reset UI
  document.getElementById("start-spoofing-btn")!.style.display = "inline-flex";
  document.getElementById("stop-spoofing-btn")!.style.display = "none";
  interfaceName.textContent = "No interface selected";
  
  // Stop monitoring
  stopSessionMonitoring();
  
  // Reload interfaces
  loadNetworkInterfaces();
}

function updateStatus(type: "ready" | "loading" | "active" | "error" | "warning", message: string) {
  statusIndicator.className = `fas fa-circle status-indicator ${type}`;
  statusText.textContent = message;
}

function showLoading(message: string) {
  loadingText.textContent = message;
  loadingOverlay.style.display = "flex";
}

function hideLoading() {
  loadingOverlay.style.display = "none";
}

function showError(message: string) {
  // Simple error notification - in a real app, you'd use a proper notification system
  alert("Error: " + message);
}

function showSuccess(message: string) {
  // Simple success notification - in a real app, you'd use a proper notification system
  console.log("Success: " + message);
}

/**
 * Start spoofing for all discovered devices at once
 */
async function startSpoofAll() {
  if (!selectedInterface) {
    showError("Please select a network interface first");
    return;
  }
  
  // Get the gateway IP (assuming the first device with .1 or named router)
  const gatewayDevice = findGatewayDevice();
  if (!gatewayDevice) {
    showError("Could not identify the gateway device");
    return;
  }
  
  const gatewayIp = gatewayDevice.ip;
  const devices = getAllDevices().filter(d => d.ip !== gatewayIp);
  
  if (devices.length === 0) {
    showError("No devices found to spoof");
    return;
  }
  
  try {
    showLoading("Starting mass ARP spoofing...");
    updateStatus("loading", "Starting spoofing for all devices...");
    
    // Show sessions container
    sessionsContainer.classList.remove("slide-in-right");
    sessionsContainer.style.display = "block";
    sessionsContainer.classList.add("visible");
    
    // Force a reflow
    void sessionsContainer.offsetWidth;
    
    // Add animation
    sessionsContainer.classList.add("slide-in-right");
    
    console.log("Calling start_spoof_all with:", {
      devices,
      gatewayIp,
      interfaceName: selectedInterface.name
    });
    
    // Call the backend to start spoofing for all devices at once
    const sessionIds = await invoke("start_spoof_all", {
      devices,
      gatewayIp,
      interfaceName: selectedInterface.name
    });
    
    console.log("Started spoofing with session IDs:", sessionIds);
    
    // Start session monitoring
    startSessionMonitoring();
    
    // Update UI
    document.getElementById("start-spoofing-btn")!.style.display = "none";
    document.getElementById("stop-spoofing-btn")!.style.display = "inline-flex";
    document.getElementById("spoof-all-btn")!.style.display = "none";
    
    // Show status message
    updateStatus("active", `Spoofing active: ${devices.length} devices`);
    showSuccess(`ARP spoofing started for all ${devices.length} devices`);
    
  } catch (error) {
    console.error("Failed mass spoofing:", error);
    updateStatus("error", "Failed to start mass spoofing");
    showError("Failed to start mass ARP spoofing: " + error);
  } finally {
    hideLoading();
  }
}

/**
 * Find the gateway device from the current list of devices
 */
function findGatewayDevice(): NetworkDevice | null {
  const devices = getAllDevices();
  
  // First try to find a device with IP ending in .1
  const gatewayByIp = devices.find(d => d.ip.endsWith('.1'));
  if (gatewayByIp) return gatewayByIp;
  
  // Then try to find a device with "router" in the hostname
  const gatewayByName = devices.find(d => 
    d.hostname.toLowerCase().includes('router') || 
    d.hostname.toLowerCase().includes('gateway')
  );
  if (gatewayByName) return gatewayByName;
  
  // If no gateway found, return null
  return null;
}

/**
 * Get all currently displayed devices
 */
function getAllDevices(): NetworkDevice[] {
  const devices: NetworkDevice[] = [];
  const deviceCards = document.querySelectorAll('.device-card');
  
  deviceCards.forEach(card => {
    // Extract device data from the card's dataset
    const ip = card.querySelector('.device-ip')?.textContent || '';
    const mac = card.querySelector('.device-detail-value')?.textContent || '';
    const hostname = card.querySelectorAll('.device-detail-value')[1]?.textContent || '';
    const vendor = card.querySelectorAll('.device-detail-value')[2]?.textContent || '';
    
    devices.push({ ip, mac, hostname, vendor });
  });
  
  return devices;
}
