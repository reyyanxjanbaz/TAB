import { cn } from '../../lib/utils';

export function Input({ label, error, className, prefix, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-stone-700">{label}</label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">{prefix}</span>
        )}
        <input
          className={cn(
            'w-full bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-base text-stone-900 placeholder-stone-400',
            'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
            'transition-all duration-150',
            prefix && 'pl-11',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
