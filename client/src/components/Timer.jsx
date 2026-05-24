import { useState, useEffect } from 'react';
import { formatTimer } from '../lib/utils';
import { cn } from '../lib/utils';

export function Timer({ endsAt, onExpire }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    function tick() {
      const remaining = Math.max(0, Math.ceil((new Date(endsAt) - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && onExpire) onExpire();
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const total = Math.ceil((new Date(endsAt) - new Date(endsAt).setSeconds(0)) / 1000);
  const pct = seconds > 0 ? (seconds / (seconds + 1)) : 0; // approximate
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
