import { createContext, useContext, useCallback, ReactNode } from 'react';
import {
  Toast,
  ToastTitle,
  ToastBody,
  Toaster,
  useToastController,
  useId,
  ToastIntent,
} from '@fluentui/react-components';

interface ToastContextType {
  showToast: (message: string, title?: string, intent?: ToastIntent) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const showToast = useCallback(
    (message: string, title?: string, intent: ToastIntent = 'info') => {
      dispatchToast(
        <Toast>
          {title && <ToastTitle>{title}</ToastTitle>}
          <ToastBody>{message}</ToastBody>
        </Toast>,
        { intent, timeout: 2500, position: 'bottom-start' }
      );
    },
    [dispatchToast]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => showToast(message, title, 'success'),
    [showToast]
  );

  const showError = useCallback(
    (message: string, title?: string) => showToast(message, title, 'error'),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => showToast(message, title, 'warning'),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => showToast(message, title, 'info'),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Toaster toasterId={toasterId} position="bottom-start" />
    </ToastContext.Provider>
  );
}
