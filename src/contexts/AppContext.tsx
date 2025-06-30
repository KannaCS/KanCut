/**
 * Application context for managing global state like errors and logs
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppError, handleError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// Define the context shape
interface AppContextType {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  handleApiError: (error: any) => void;
  clearError: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
}

// Create the context with default values
const AppContext = createContext<AppContextType>({
  error: null,
  setError: () => {},
  handleApiError: () => {},
  clearError: () => {},
  isLoading: false,
  setIsLoading: () => {},
  showLogs: false,
  setShowLogs: () => {}
});

// Custom hook to use the AppContext
export const useAppContext = () => useContext(AppContext);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  
  // Handler for API errors
  const handleApiError = useCallback((err: any) => {
    const appError = handleError(err);
    setError(appError);
    return appError;
  }, []);
  
  // Clear current error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Create the context value
  const contextValue = {
    error,
    setError,
    handleApiError,
    clearError,
    isLoading,
    setIsLoading,
    showLogs,
    setShowLogs
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider; 