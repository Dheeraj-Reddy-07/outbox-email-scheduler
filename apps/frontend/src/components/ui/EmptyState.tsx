import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-full">
          <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}