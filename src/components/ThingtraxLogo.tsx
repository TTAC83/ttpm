import React from 'react';
import { cn } from '@/lib/utils';

interface ThingtraxLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'icon-only';
}

export const ThingtraxLogo: React.FC<ThingtraxLogoProps> = ({ 
  className, 
  size = 'md', 
  variant = 'default' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  };

  const textSizeClasses = {
    sm: 'text-small',
    md: 'text-medium',
    lg: 'text-big'
  };

  const iconSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  if (variant === 'icon-only') {
    return (
      <div className={cn(
        iconSizeClasses[size],
        "rounded-thingtrax-corners bg-gradient-thingtrax flex items-center justify-center shadow-thingtrax thingtrax-corners",
        className
      )}>
        <span className={cn("text-white font-bold", textSizeClasses[size])}>TT</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          iconSizeClasses[size],
          "rounded-thingtrax-corners bg-gradient-thingtrax flex items-center justify-center shadow-thingtrax thingtrax-corners"
        )}>
          <span className={cn("text-white font-bold", textSizeClasses[size])}>TT</span>
        </div>
        <span className={cn("font-black text-thingtrax-blue", textSizeClasses[size])}>
          Thingtrax
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        iconSizeClasses[size],
        "rounded-thingtrax-corners bg-gradient-thingtrax flex items-center justify-center shadow-thingtrax thingtrax-corners"
      )}>
        <span className={cn("text-white font-bold", textSizeClasses[size])}>TT</span>
      </div>
      <div className="flex flex-col">
        <span className={cn("font-black text-thingtrax-blue leading-tight", textSizeClasses[size])}>
          Thingtrax
        </span>
        {size !== 'sm' && (
          <span className="text-small text-thingtrax-gray leading-tight">
            Implementation
          </span>
        )}
      </div>
    </div>
  );
};

export default ThingtraxLogo;