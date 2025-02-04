import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastProps = {
  type: 'success' | 'error' | 'info';
  message: string;
};

export function Toast({ type, message }: ToastProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
        {icons[type]}
        <span>{message}</span>
      </div>
    </div>
  );
}