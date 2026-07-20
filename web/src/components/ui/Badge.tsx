import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    primary: 'bg-primary-600/20 text-primary-400 border border-primary-600',
    accent: 'bg-accent-500/20 text-accent-400 border border-accent-500',
    success: 'bg-success-500/20 text-success-500 border border-success-500',
    warning: 'bg-warning-500/20 text-warning-500 border border-warning-500',
    error: 'bg-error-500/20 text-error-500 border border-error-500',
    gray: 'bg-dark-cardElevated text-text-tertiary border border-dark-border',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

