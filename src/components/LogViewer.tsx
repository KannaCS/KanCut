/**
 * Log Viewer component for displaying application logs
 */

import { useState, useEffect, useRef } from 'react';
import { LogLevel, logger } from '../utils/logger';

interface LogViewerProps {
  maxLogCount?: number;
  height?: string;
  width?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ 
  maxLogCount = 1000,
  height = '300px',
  width = '100%'
}) => {
  const [logs, setLogs] = useState(logger.getLogs());
  const [filter, setFilter] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Refresh logs every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setLogs([...logger.getLogs()]);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Filter logs based on selected level
  const filteredLogs = filter === 'ALL' 
    ? logs 
    : logs.filter(log => log.level === filter);
  
  // Display only the most recent logs up to maxLogCount
  const displayLogs = filteredLogs.slice(-maxLogCount);
  
  // Clear all logs
  const handleClearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };
  
  // Export logs as JSON file
  const handleExportLogs = () => {
    const logsJson = logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kancut-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="log-viewer" style={{ width, height: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div className="log-toolbar" style={{ display: 'flex', alignItems: 'center', padding: '8px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <label style={{ marginRight: '12px' }}>
          Filter:
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ marginLeft: '8px' }}
          >
            <option value="ALL">All Logs</option>
            <option value={LogLevel.DEBUG}>Debug</option>
            <option value={LogLevel.INFO}>Info</option>
            <option value={LogLevel.WARN}>Warning</option>
            <option value={LogLevel.ERROR}>Error</option>
          </select>
        </label>
        
        <label style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={autoScroll} 
            onChange={(e) => setAutoScroll(e.target.checked)}
            style={{ marginRight: '4px' }}
          />
          Auto-scroll
        </label>
        
        <button 
          onClick={handleClearLogs}
          style={{ marginRight: '8px', padding: '4px 8px' }}
        >
          Clear Logs
        </button>
        
        <button 
          onClick={handleExportLogs}
          style={{ padding: '4px 8px' }}
        >
          Export Logs
        </button>
      </div>
      
      <div 
        ref={logContainerRef}
        className="log-container" 
        style={{ 
          height, 
          overflowY: 'auto', 
          padding: '8px', 
          backgroundColor: '#1e1e1e', 
          color: '#f0f0f0', 
          fontFamily: 'monospace',
          fontSize: '12px',
          flex: 1
        }}
      >
        {displayLogs.map((log, index) => {
          // Determine log level styling
          let logColor = '#dcdcaa'; // Default (INFO)
          switch (log.level) {
            case LogLevel.DEBUG:
              logColor = '#9cdcfe';
              break;
            case LogLevel.WARN:
              logColor = '#ce9178';
              break;
            case LogLevel.ERROR:
              logColor = '#f44747';
              break;
          }
          
          // Format timestamp
          const timestamp = new Date(log.timestamp);
          const formattedTime = timestamp.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          
          return (
            <div 
              key={index} 
              className={`log-entry ${log.level.toLowerCase()}`}
              style={{ 
                padding: '4px 0', 
                borderBottom: '1px solid #333', 
                lineHeight: 1.5,
                color: logColor
              }}
            >
              <span style={{ color: '#888', marginRight: '8px' }}>
                {formattedTime}
              </span>
              <span style={{ display: 'inline-block', width: '60px', fontWeight: 'bold' }}>
                [{log.level}]
              </span>
              <span>{log.message}</span>
              
              {log.data && typeof log.data === 'object' && Object.keys(log.data).length > 0 && (
                <div style={{ marginLeft: '20px', color: '#888', fontSize: '11px' }}>
                  {JSON.stringify(log.data)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogViewer; 