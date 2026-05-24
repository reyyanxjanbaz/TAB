import { initials } from '../lib/utils';
import { cn } from '../lib/utils';

export function Avatar({ user, size = 'md', className }) {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
        sizes[size],
        className
      )}
      style={{ backgroundColor: user?.avatar_color || '#FF6B35' }}
    >
      {initials(user?.username || '?')}
    </div>
  );
}

export function AvatarStack({ users, max = 4, size = 'sm' }) {
  const shown = users.slice(0, max);
  const extra = users.length - max;

  return (
    <div className="flex -space-x-2">
      {shown.map(u => (
        <div key={u.id} className="ring-2 ring-white rounded-full">
          <Avatar user={u} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div className="ring-2 ring-white rounded-full w-9 h-9 bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
          +{extra}
        </div>
      )}
    </div>
  );
}
