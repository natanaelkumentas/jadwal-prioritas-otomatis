'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg ${className}`}
    />
  );
}

export default Skeleton;
