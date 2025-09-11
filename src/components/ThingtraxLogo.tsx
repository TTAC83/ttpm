import React from 'react';
import { cn } from '@/lib/utils';

interface ThingtraxLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal';
}

export const ThingtraxLogo: React.FC<ThingtraxLogoProps> = ({ 
  className, 
  size = 'md', 
  variant = 'default' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };

  const imageClasses = cn(
    sizeClasses[size],
    "w-auto object-contain",
    className
  );

  return (
    <img 
      src="/lovable-uploads/1a8ed3d8-3e37-45ff-aac8-bd3820012684.png" 
      alt="Thingtrax" 
      className={imageClasses}
    />
  );
};

export default ThingtraxLogo;