import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };
  
  return (
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow-sm ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}