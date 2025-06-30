// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::State;
use kancut_lib::{SpoofingSessions, CustomNetworkInterface, NetworkDevice, SpoofingSession};
use log::{info, debug};

mod logger;
mod error_handler;

#[tauri::command]
fn get_interfaces() -> Result<Vec<CustomNetworkInterface>, String> {
    info!("Getting network interfaces");
    match kancut_lib::get_interfaces() {
        Ok(interfaces) => {
            debug!("Found {} network interfaces", interfaces.len());
            Ok(interfaces)
        },
        Err(e) => {
            let app_error = error_handler::interface_error(
                "Failed to get network interfaces", 
                Some(&e)
            );
            Err(error_handler::to_string_error(app_error))
        }
    }
}

#[tauri::command]
fn scan_network(interface_name: String) -> Result<Vec<NetworkDevice>, String> {
    info!("Scanning network on interface: {}", interface_name);
    match kancut_lib::scan_network(interface_name) {
        Ok(devices) => {
            debug!("Found {} devices on network", devices.len());
            Ok(devices)
        },
        Err(e) => {
            let app_error = error_handler::network_error(
                "Failed to scan network", 
                Some(&e)
            );
            Err(error_handler::to_string_error(app_error))
        }
    }
}

#[tauri::command]
fn start_spoofing(
    target_ip: String,
    gateway_ip: String, 
    interface_name: String,
    state: State<SpoofingSessions>,
) -> Result<String, String> {
    info!("Starting spoofing attack - Target: {}, Gateway: {}, Interface: {}", 
          target_ip, gateway_ip, interface_name);
    match kancut_lib::start_spoofing(target_ip, gateway_ip, interface_name, state) {
        Ok(session_id) => {
            info!("Spoofing started successfully with session ID: {}", session_id);
            Ok(session_id)
        },
        Err(e) => {
            let app_error = error_handler::spoofing_error(
                "Failed to start spoofing attack", 
                Some(&e)
            );
            Err(error_handler::to_string_error(app_error))
        }
    }
}

#[tauri::command]
fn stop_spoofing(
    session_id: String,
    state: State<SpoofingSessions>,
) -> Result<bool, String> {
    info!("Stopping spoofing session: {}", session_id);
    match kancut_lib::stop_spoofing(session_id.clone(), state) {
        Ok(result) => {
            info!("Spoofing session stopped: {}", session_id);
            Ok(result)
        },
        Err(e) => {
            let app_error = error_handler::spoofing_error(
                &format!("Failed to stop spoofing session {}", session_id),
                Some(&e)
            );
            Err(error_handler::to_string_error(app_error))
        }
    }
}

#[tauri::command]
fn get_active_sessions(
    state: State<SpoofingSessions>,
) -> Result<Vec<SpoofingSession>, String> {
    debug!("Getting active spoofing sessions");
    match kancut_lib::get_active_sessions(state) {
        Ok(sessions) => {
            debug!("Found {} active sessions", sessions.len());
            Ok(sessions)
        },
        Err(e) => {
            let app_error = error_handler::system_error(
                "Failed to get active sessions", 
                Some(&e)
            );
            Err(error_handler::to_string_error(app_error))
        }
    }
}

#[tauri::command]
fn start_spoof_all(
    devices: Vec<NetworkDevice>,
    gateway_ip: String,
    interface_name: String,
    state: State<SpoofingSessions>
) -> Result<Vec<String>, String> {
    info!("Starting spoofing for all {} devices on interface {} with gateway {}", 
          devices.len(), interface_name, gateway_ip);
    match kancut_lib::start_spoof_all(devices, gateway_ip, interface_name, state) {
        Ok(session_ids) => {
            info!("Started spoofing for {} devices", session_ids.len());
            Ok(session_ids)
        },
        Err(e) => {
            let app_error = error_handler::spoofing_error(
                "Failed to start spoofing for all devices", 
                Some(&e)
            );
            Err(error_handler::to_string_error(app_error))
        }
    }
}

fn main() {
    // Initialize custom logger
    logger::init();
    
    info!("Starting KanCut application");
    
    tauri::Builder::default()
        .manage(kancut_lib::SpoofingSessions::default())
        .invoke_handler(tauri::generate_handler![
            get_interfaces,
            scan_network,
            start_spoofing,
            stop_spoofing,
            get_active_sessions,
            start_spoof_all
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

