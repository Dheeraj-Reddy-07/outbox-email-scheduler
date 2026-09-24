import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ className = '', variant = 'rectangular', width, height }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };
  
  const style = {
    width: width || (variant === 'text' ? '100%' : 'auto'),
    height: height || (variant === 'text' ? '1rem' : 'auto'),
  };
  
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-slate-800 ${variantStyles[variant]} ${className}`}
      style={style}
    />
  );
}