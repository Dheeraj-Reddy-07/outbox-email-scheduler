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
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        {Icon && (
          <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        {trend && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{trend}</p>
        )}
      </div>
    </div>
  );
}