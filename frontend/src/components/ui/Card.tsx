import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hover = false, children, ...props }) => {
  return (
    <div
      className={cn(
        'bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-lg shadow-black/20',
        hover && 'transition-all duration-200 hover:border-slate-700 hover:shadow-indigo-500/5 hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
