import React from 'react';

export const cn = (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' ');

export const Button = ({ className, variant = 'primary', size = 'default', ...props }: any) => {
  const base = "rounded-md font-medium transition-all inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
    destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700",
  };
  const sizes: Record<string, string> = {
    default: "px-4 py-2 text-base",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3 text-lg",
  };
  return <button className={cn(base, variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props} />;
};

export const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div
    className={cn(
      "bg-white p-6 rounded-xl border border-gray-100 shadow-sm",
      "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
      onClick && "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors",
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

/** 标签徽章 */
export const Badge = ({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}) => {
  const colors: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', colors[variant], className)}>
      {children}
    </span>
  );
};

/** 难度星级 */
export const DifficultyDots = ({ level }: { level: 'easy' | 'medium' | 'hard' }) => {
  const map = { easy: 1, medium: 2, hard: 3 };
  const count = map[level];
  const colors = { easy: 'bg-emerald-400', medium: 'bg-amber-400', hard: 'bg-red-400' };
  return (
    <span className="inline-flex gap-0.5">
	      {[1, 2, 3].map((i) => (
	        <span key={i} className={cn('w-1.5 h-4 rounded-full', i <= count ? colors[level] : 'bg-gray-200 dark:bg-gray-600')} />
	      ))}
	    </span>
	  );
	};

	// ---- Input ----

	export const Input = ({
	  label,
	  error,
	  className,
	  id,
	  ...props
	}: {
	  label?: string;
	  error?: string;
	} & React.InputHTMLAttributes<HTMLInputElement>) => {
	  return (
	    <div className="space-y-1">
	      {label && (
	        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
	          {label}
	        </label>
	      )}
	      <input
	        id={id}
	        className={cn(
	          'w-full px-3 py-2 border border-gray-300 rounded-lg',
	          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
	          'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400',
	          'transition-colors',
	          error && 'border-red-500 focus:ring-red-500',
	          className
	        )}
	        {...props}
	      />
	      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
	    </div>
	  );
	};

	// ---- Modal ----

	export const Modal = ({
	  open,
	  onClose,
	  title,
	  children,
	  className,
	}: {
	  open: boolean;
	  onClose: () => void;
	  title?: string;
	  children: React.ReactNode;
	  className?: string;
	}) => {
	  if (!open) return null;
	  return (
	    <div className="fixed inset-0 z-50 flex items-center justify-center">
	      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
	      <div className={cn('relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto', className)}>
	        {title && (
	          <div className="flex items-center justify-between mb-4">
	            <h3 className="text-lg font-bold dark:text-gray-100">{title}</h3>
	            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
	          </div>
	        )}
	        {children}
	      </div>
	    </div>
	  );
	};

		// ---- ProgressBar ----

		export const ProgressBar = ({ value, max = 100, className, showLabel }: { value: number; max?: number; className?: string; showLabel?: boolean }) => {
		  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
		  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
		  return (
		    <div className="flex items-center gap-2">
		      <div className={cn("flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2", className)}>
		        <div className={cn("h-2 rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
		      </div>
		      {showLabel && <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-9 text-right">{pct}%</span>}
		    </div>
		  );
		};

		// ---- Spinner ----

		export const Spinner = ({ className }: { className?: string }) => (
	  <svg className={cn('animate-spin h-5 w-5 text-blue-600 dark:text-blue-400', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
	    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
	    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	  </svg>
	);
