/**
 * Error Handler component for displaying application errors
 */

import React, { useState, useEffect } from 'react';
import { AppError, formatErrorForDisplay } from '../utils/errorHandler';

interface ErrorHandlerProps {
  error?: AppError | null;
  onClose?: () => void;
  autoHideTimeout?: number; // in milliseconds, 0 means never auto-hide
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({ 
  error, 
  onClose,
  autoHideTimeout = 5000 
}) => {
  const [visible, setVisible] = useState(!!error);
  
  // Reset visibility when error changes
  useEffect(() => {
    setVisible(!!error);
    
    // Set up auto-hide if needed
    if (error && autoHideTimeout > 0) {
      const timerId = setTimeout(() => {
        setVisible(false);
        if (onClose) {
          onClose();
        }
      }, autoHideTimeout);
      
      return () => clearTimeout(timerId);
    }
  }, [error, autoHideTimeout, onClose]);
  
  // If no error or not visible, don't render anything
  if (!error || !visible) {
    return null;
  }
  
  // Determine background color based on error type
  let bgColor = '#f44336'; // Default - red
  switch (error.type) {
    case 'NETWORK':
      bgColor = '#ff9800'; // Orange
      break;
    case 'PERMISSION':
      bgColor = '#d32f2f'; // Deep red
      break;
    case 'CONFIGURATION':
      bgColor = '#2196f3'; // Blue
      break;
    case 'INTERFACE':
    case 'SPOOFING':
    case 'SYSTEM':
      bgColor = '#f44336'; // Red
      break;
    case 'UNKNOWN':
    default:
      bgColor = '#757575'; // Gray
      break;
  }
  
  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <div 
      className="error-handler"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '400px',
        backgroundColor: bgColor,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.3s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {error.type}
        </div>
        <button 
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '0 4px',
            marginLeft: '8px',
            marginTop: '-4px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        {error.message}
      </div>
      
      {error.details && (
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          {error.details}
        </div>
      )}
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default ErrorHandler; 