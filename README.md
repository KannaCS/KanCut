# KanCut

A network traffic control and ARP spoofing application built with Tauri and Rust.

## Features

- Scan local network interfaces
- Discover devices on the network
- Perform ARP spoofing to intercept network traffic
- Detailed logging and error handling system

## System Requirements

- Windows 10 or newer
- Administrator privileges (required for network operations)
- WinPcap or Npcap installed (see WINPCAP_SETUP.md)

## Development

### Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable)
- Tauri CLI
- WinPcap or Npcap development libraries

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development build:
   ```
   npm run tauri dev
   ```

## Logging System

KanCut includes a comprehensive logging system:

### Backend (Rust)

- Log levels: Debug, Info, Warn, Error
- File-based logging to `logs/kancut.log`
- Console output during development
- Performance metrics tracking

### Frontend (TypeScript)

- Client-side logging with matching log levels
- Log viewer component for browsing logs
- Export logs to JSON for troubleshooting
- Filter logs by level

## Error Handling

KanCut provides robust error handling:

### Backend Error Types

- Network errors
- Interface errors
- Spoofing errors
- System errors
- Permission errors
- Configuration errors

### Frontend Error Management

- Error context provider for global error state
- Toast-style error notifications
- Different styling based on error type
- Automatic error logging

## Building

To build the application:

```
npm run tauri build
```

## License

[License information]
