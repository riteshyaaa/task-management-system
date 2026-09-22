import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700/60',
    primary: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-500/30',
    info: 'bg-sky-950/80 text-sky-300 border-sky-500/30',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-medium tracking-wide',
    md: 'px-2.5 py-1 text-xs font-medium tracking-wide',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-semibold uppercase tracking-wider',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
