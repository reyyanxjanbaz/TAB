import { useEffect } from 'react';
import { cn } from '../../lib/utils';

export function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md pb-safe animate-slide-up',
        'shadow-2xl',
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
