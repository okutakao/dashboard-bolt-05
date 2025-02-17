import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastProps = {
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;  // ミリ秒単位でトーストの表示時間を指定
  onClose?: () => void;  // トーストを閉じる際のコールバック
};

export function Toast({ type, message, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

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
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}