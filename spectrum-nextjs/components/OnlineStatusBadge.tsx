'use client';

import React from 'react';

interface OnlineStatusBadgeProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function OnlineStatusBadge({
  isOnline,
  size = 'md',
  showLabel = false,
}: OnlineStatusBadgeProps) {
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const badgeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`relative inline-flex ${badgeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          } shadow-lg`}
          title={isOnline ? 'Online' : 'Offline'}
        />
        {isOnline && (
          <div
            className={`${sizeClasses[size]} rounded-full border-2 border-white absolute inset-0 animate-pulse`}
            style={{ opacity: 0.3 }}
          />
        )}
      </div>
      {showLabel && (
        <span
          className={`text-xs font-medium ${
            isOnline ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
