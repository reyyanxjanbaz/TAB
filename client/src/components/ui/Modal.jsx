import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

export function Modal({ open, onClose, title, children, className }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    function adjust() {
      if (!sheetRef.current || !window.visualViewport) return;
      const vv = window.visualViewport;
      const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;
      sheetRef.current.style.transform = `translateY(-${Math.max(0, offsetBottom)}px)`;
    }

    window.visualViewport?.addEventListener('resize', adjust);
    window.visualViewport?.addEventListener('scroll', adjust);
    adjust();

    return () => {
      document.body.style.overflow = '';
      window.visualViewport?.removeEventListener('resize', adjust);
      window.visualViewport?.removeEventListener('scroll', adjust);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={cn(
          'relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md pb-safe animate-slide-up',
          'shadow-2xl max-h-[85dvh] flex flex-col',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
            <h2 className="text-lg font-bold text-stone-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 active:bg-stone-200"
            >
              ✕
            </button>
          </div>
        )}
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
