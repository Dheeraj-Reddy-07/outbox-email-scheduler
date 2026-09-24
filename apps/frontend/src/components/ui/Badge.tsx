import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'sent';
  className?: string;
}

export default function Badge({ children, variant = 'pending', className = '' }: BadgeProps) {
  const variantStyles = {
    scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    running: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800',
    failed: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800',
    cancelled: 'bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-gray-300 border border-gray-200 dark:border-slate-700',
    pending: 'bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-gray-300 border border-gray-200 dark:border-slate-700',
    sent: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}