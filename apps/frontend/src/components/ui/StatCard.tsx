import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 shadow-sm h-[88px] flex items-center ${className}`}>
      <div className="flex-1">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white leading-none mt-1">{value}</p>
        {trend && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{trend}</p>
        )}
      </div>
      {Icon && (
        <div className="ml-3 p-2 bg-gray-50 dark:bg-slate-800 rounded-md">
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
      )}
    </div>
  );
}