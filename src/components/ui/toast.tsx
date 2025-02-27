import { useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  onClose: () => void;
}

export function Toast({ type, message, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg',
        'transform transition-all duration-300 ease-in-out',
        'animate-in fade-in slide-in-from-bottom-5',
        {
          'bg-green-500 text-white': type === 'success',
          'bg-red-500 text-white': type === 'error',
          'bg-blue-500 text-white': type === 'info',
        }
      )}
      role="alert"
    >
      {message}
    </div>
  );
} 