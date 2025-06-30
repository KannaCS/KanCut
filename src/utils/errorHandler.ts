/**
 * Error handler utility for the KanCut application frontend
 */

import { error } from './logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  INTERFACE = 'INTERFACE',
  SPOOFING = 'SPOOFING',
  SYSTEM = 'SYSTEM',
  PERMISSION = 'PERMISSION',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  originalError?: any;
  timestamp: number;
}

/**
 * Parse an error message from the backend
 * The format is typically: "[ERROR_CODE] Error message: details"
 */
export function parseBackendError(errorMsg: string): AppError {
  let type = ErrorType.UNKNOWN;
  let message = errorMsg;
  let details = undefined;
  
  // Try to detect error type from message
  if (errorMsg.includes('NETWORK_ERROR')) {
    type = ErrorType.NETWORK;
  } else if (errorMsg.includes('INTERFACE_ERROR')) {
    type = ErrorType.INTERFACE;
  } else if (errorMsg.includes('SPOOFING_ERROR')) {
    type = ErrorType.SPOOFING;
  } else if (errorMsg.includes('SYSTEM_ERROR')) {
    type = ErrorType.SYSTEM;
  } else if (errorMsg.includes('PERMISSION_ERROR')) {
    type = ErrorType.PERMISSION;
  } else if (errorMsg.includes('CONFIG_ERROR')) {
    type = ErrorType.CONFIGURATION;
  }
  
  // Try to extract details if message has a format like "Message: Details"
  const colonIndex = errorMsg.indexOf(':');
  if (colonIndex > 0) {
    message = errorMsg.substring(0, colonIndex).trim();
    details = errorMsg.substring(colonIndex + 1).trim();
  }
  
  // Clean up any error code prefixes
  const bracketIndex = message.indexOf(']');
  if (message.startsWith('[') && bracketIndex > 0) {
    message = message.substring(bracketIndex + 1).trim();
  }
  
  return {
    type,
    message,
    details,
    timestamp: Date.now()
  };
}

/**
 * Create a network error
 */
export function createNetworkError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.NETWORK,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Create an interface error
 */
export function createInterfaceError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.INTERFACE,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Create a spoofing error
 */
export function createSpoofingError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.SPOOFING,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Create a system error
 */
export function createSystemError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.SYSTEM,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Create a permission error
 */
export function createPermissionError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.PERMISSION,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Create a configuration error
 */
export function createConfigError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.CONFIGURATION,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Create an unknown error
 */
export function createUnknownError(message: string, details?: string, originalError?: any): AppError {
  const appError = {
    type: ErrorType.UNKNOWN,
    message,
    details,
    originalError,
    timestamp: Date.now()
  };
  
  // Log the error
  logError(appError);
  
  return appError;
}

/**
 * Log an AppError
 */
function logError(appError: AppError): void {
  const logMessage = `[${appError.type}] ${appError.message}`;
  const logDetails = {
    details: appError.details,
    originalError: appError.originalError,
    timestamp: new Date(appError.timestamp).toISOString()
  };
  
  error(logMessage, logDetails);
}

/**
 * Handle and transform any error into an AppError
 */
export function handleError(err: any): AppError {
  // If it's already an AppError, just return it
  if (err && typeof err === 'object' && 'type' in err && 'message' in err) {
    return err as AppError;
  }
  
  // If it's a string, try to parse it as a backend error
  if (typeof err === 'string') {
    return parseBackendError(err);
  }
  
  // If it has a message property, use that
  if (err && typeof err === 'object' && 'message' in err) {
    return createUnknownError(err.message, undefined, err);
  }
  
  // Otherwise, just stringify it
  return createUnknownError(
    'An unknown error occurred',
    err ? JSON.stringify(err) : undefined,
    err
  );
}

/**
 * Format an AppError for display
 */
export function formatErrorForDisplay(appError: AppError): string {
  if (appError.details) {
    return `${appError.message}: ${appError.details}`;
  }
  return appError.message;
} 