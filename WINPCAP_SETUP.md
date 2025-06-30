# WinPcap/Npcap Installation Guide for KanCut ARP Spoofing Application

## Installation Options

### Option 1: Npcap (Recommended)
Npcap is the modern successor to WinPcap and is actively maintained.

1. **Download Npcap:**
   - Visit: https://npcap.com/#download
   - Download the latest Npcap installer

2. **Install Npcap:**
   - Run the installer as Administrator
   - **IMPORTANT:** Check "Install Npcap in WinPcap API-compatible Mode"
   - This ensures compatibility with applications expecting WinPcap

3. **Verify Installation:**
   - The installer should place `Packet.lib` in the system
   - Usually located in: `C:\Windows\System32\Npcap\`

### Option 2: WinPcap (Legacy)
WinPcap is older but still works for basic packet capture.

1. **Download WinPcap:**
   - Visit: https://www.winpcap.org/install/
   - Download WinPcap installer

2. **Install WinPcap:**
   - Run installer as Administrator
   - Follow standard installation steps

## Post-Installation Steps

### 1. Verify Packet.lib Location
After installation, verify that `Packet.lib` is available:
```cmd
dir C:\Windows\System32\Npcap\Packet.lib
```
or
```cmd
dir C:\Windows\System32\Packet.lib
```

### 2. Set Environment Variables (if needed)
If the build still fails, you may need to set:
```cmd
set LIB=%LIB%;C:\Windows\System32\Npcap
```

### 3. Build the Application
After installing Npcap/WinPcap:
```cmd
cd src-tauri
cargo build
```

## Troubleshooting

### Error: "cannot open input file 'Packet.lib'"
- Ensure Npcap/WinPcap is properly installed
- Check that "WinPcap API-compatible Mode" was selected during Npcap installation
- Try running the installer as Administrator

### Permission Issues
- The application may need to run as Administrator for raw packet access
- This is normal for network packet manipulation tools

### Firewall/Antivirus Warnings
- ARP spoofing tools may trigger security software
- Add exceptions if necessary (use responsibly)

## Application Features After Installation

Once WinPcap/Npcap is installed, your application will have:

1. **Real ARP-based Network Scanning:**
   - Sends ARP requests to discover devices
   - Gets actual MAC addresses from responses
   - More accurate than ping-based scanning

2. **Actual ARP Spoofing:**
   - Crafts and sends real ARP packets
   - Performs bidirectional spoofing (target ↔ gateway)
   - Updates ARP tables of target devices

3. **Professional Network Discovery:**
   - Results comparable to other ARP spoofing tools
   - Proper MAC address resolution
   - Network topology mapping

## Security Notice

This tool is for educational and authorized testing purposes only:
- Only use on networks you own or have explicit permission to test
- Unauthorized network interference may violate local laws
- Use responsibly and ethically

## Next Steps

1. Install Npcap with WinPcap compatibility mode
2. Build the application: `cargo build`
3. Run the application: `npm run tauri dev`
4. Test network scanning and spoofing functionality