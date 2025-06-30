use std::fmt;
use log::error;
use serde::{Serialize, Deserialize};

/// Custom error type for the application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<String>,
}

/// Error codes for different types of errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorCode {
    NetworkError,
    InterfaceError,
    SpoofingError,
    SystemError,
    PermissionError,
    ConfigurationError,
    UnknownError,
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorCode::NetworkError => write!(f, "NETWORK_ERROR"),
            ErrorCode::InterfaceError => write!(f, "INTERFACE_ERROR"),
            ErrorCode::SpoofingError => write!(f, "SPOOFING_ERROR"),
            ErrorCode::SystemError => write!(f, "SYSTEM_ERROR"),
            ErrorCode::PermissionError => write!(f, "PERMISSION_ERROR"),
            ErrorCode::ConfigurationError => write!(f, "CONFIG_ERROR"),
            ErrorCode::UnknownError => write!(f, "UNKNOWN_ERROR"),
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

/// Creates a new AppError
pub fn new_error(code: ErrorCode, message: &str, details: Option<&str>) -> AppError {
    let error = AppError {
        code,
        message: message.to_string(),
        details: details.map(|s| s.to_string()),
    };
    
    // Log the error
    error!("{}", error);
    if let Some(details) = &error.details {
        error!("Error details: {}", details);
    }
    
    error
}

/// Helper function to convert a standard error string to an AppError
pub fn from_string(error_str: String) -> AppError {
    new_error(
        ErrorCode::UnknownError,
        &error_str,
        None
    )
}

/// Helper function for network errors
pub fn network_error(message: &str, details: Option<&str>) -> AppError {
    new_error(ErrorCode::NetworkError, message, details)
}

/// Helper function for interface errors
pub fn interface_error(message: &str, details: Option<&str>) -> AppError {
    new_error(ErrorCode::InterfaceError, message, details)
}

/// Helper function for spoofing errors
pub fn spoofing_error(message: &str, details: Option<&str>) -> AppError {
    new_error(ErrorCode::SpoofingError, message, details)
}

/// Helper function for system errors
pub fn system_error(message: &str, details: Option<&str>) -> AppError {
    new_error(ErrorCode::SystemError, message, details)
}

/// Helper function for permission errors
pub fn permission_error(message: &str, details: Option<&str>) -> AppError {
    new_error(ErrorCode::PermissionError, message, details)
}

/// Helper function for configuration errors
pub fn config_error(message: &str, details: Option<&str>) -> AppError {
    new_error(ErrorCode::ConfigurationError, message, details)
}

/// Convert AppError to a simple string error message for compatibility
pub fn to_string_error(error: AppError) -> String {
    if let Some(details) = error.details {
        format!("{}: {}", error.message, details)
    } else {
        error.message
    }
} 