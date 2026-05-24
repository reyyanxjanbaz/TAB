import { cn } from '../../lib/utils';

export function Button({ variant = 'primary', size = 'md', className, children, disabled, loading, ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400';

  const variants = {
    primary: 'bg-orange-500 text-white active:bg-orange-600 disabled:opacity-50 shadow-sm shadow-orange-200',
    secondary: 'bg-stone-100 text-stone-800 active:bg-stone-200',
    ghost: 'text-stone-600 active:bg-stone-100',
    danger: 'bg-red-500 text-white active:bg-red-600',
    outline: 'border-2 border-stone-200 text-stone-700 active:bg-stone-50',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-lg w-full',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  );
}
