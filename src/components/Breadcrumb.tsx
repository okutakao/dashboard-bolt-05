import React from 'react';
import { ChevronRight } from 'lucide-react';

type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-sm text-gray-500">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}