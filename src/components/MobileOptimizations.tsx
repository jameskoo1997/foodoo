import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Mobile detection hook
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Mobile-optimized container component
interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileContainer = ({ children, className }: MobileContainerProps) => {
  const isMobile = useMobile();
  
  return (
    <div className={cn(
      'container mx-auto',
      isMobile ? 'px-3 py-4' : 'px-4 py-8',
      className
    )}>
      {children}
    </div>
  );
};

// Mobile-responsive card grid
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveGrid = ({ children, className }: ResponsiveGridProps) => {
  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6',
      className
    )}>
      {children}
    </div>
  );
};

// Mobile-optimized button
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export const MobileButton = ({ 
  children, 
  className, 
  variant = 'default',
  size = 'default',
  ...props 
}: MobileButtonProps) => {
  const isMobile = useMobile();
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        
        // Variants
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        
        // Sizes - adjusted for mobile
        size === 'sm' && (isMobile ? 'h-10 px-3 text-sm' : 'h-9 px-3 text-sm'),
        size === 'default' && (isMobile ? 'h-12 px-4' : 'h-10 px-4 py-2'),
        size === 'lg' && (isMobile ? 'h-14 px-8 text-lg' : 'h-11 px-8'),
        
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Touch-friendly tap targets
export const TouchTarget = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'min-h-[44px] min-w-[44px] flex items-center justify-center',
        'touch-manipulation select-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};