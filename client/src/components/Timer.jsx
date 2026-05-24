import { useState, useEffect } from 'react';
import { formatTimer, cn } from '../lib/utils';

export function Timer({ endsAt, onExpire }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const expiry = new Date(endsAt).getTime();

    function remaining() {
      return Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
    }

    const initial = remaining();
    setSeconds(initial);
    if (initial === 0) {
      if (onExpire) onExpire();
      return;
    }

    const id = setInterval(() => {
      const left = remaining();
      setSeconds(left);
      if (left === 0) {
        clearInterval(id);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const urgent = seconds <= 30;

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold',
      urgent ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
    )}>
      <span className={cn('text-base', urgent && 'animate-pulse')}>⏱</span>
      <span>{formatTimer(seconds)}</span>
    </div>
  );
}
