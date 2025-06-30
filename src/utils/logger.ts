/**
 * Logger utility for the KanCut application frontend
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private logToConsole: boolean = true;
  
  // Private constructor for singleton pattern
  private constructor() {
    // Try to load log level from localStorage
    try {
      const savedLevel = localStorage.getItem('kancut_log_level');
      if (savedLevel && Object.values(LogLevel).includes(savedLevel as LogLevel)) {
        this.logLevel = savedLevel as LogLevel;
      }
    } catch (error) {
      console.warn('Failed to load log level from localStorage', error);
    }
    
    // Initialize with a welcome message
    this.info('Logger initialized', { level: this.logLevel });
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Set the current log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    try {
      localStorage.setItem('kancut_log_level', level);
    } catch (error) {
      console.warn('Failed to save log level to localStorage', error);
    }
    this.info(`Log level set to ${level}`);
  }
  
  /**
   * Set whether logs should be output to console
   */
  public setLogToConsole(logToConsole: boolean): void {
    this.logToConsole = logToConsole;
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * Log an info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * Log an error message
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * Log a message with the specified level
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Skip if level is below the current log level
    if (!this.shouldLog(level)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    // Add to in-memory log
    this.logs.push(entry);
    
    // Trim logs if they exceed the max size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Log to console if enabled
    if (this.logToConsole) {
      this.outputToConsole(entry);
    }
  }
  
  /**
   * Check if a log level should be logged based on the current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }
  
  /**
   * Output a log entry to the console
   */
  private outputToConsole(entry: LogEntry): void {
    const formattedMessage = `[${entry.level}] ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.data || '');
        break;
    }
  }
  
  /**
   * Get all logs
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Get logs filtered by level
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }
  
  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.info('Logs cleared');
  }
  
  /**
   * Export logs as JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const debug = (message: string, data?: any) => logger.debug(message, data);
export const info = (message: string, data?: any) => logger.info(message, data);
export const warn = (message: string, data?: any) => logger.warn(message, data);
export const error = (message: string, data?: any) => logger.error(message, data); 