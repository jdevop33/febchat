import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md active:bg-primary/95 active:shadow',
        destructive: 'bg-destructive text-destructive-foreground shadow hover:bg-destructive/90 hover:shadow-md active:bg-destructive/95 active:shadow',
        success: 'bg-success text-success-foreground shadow hover:bg-success/90 hover:shadow-md active:bg-success/95 active:shadow',
        warning: 'bg-warning text-warning-foreground shadow hover:bg-warning/90 hover:shadow-md active:bg-warning/95 active:shadow',
        outline: 'border border-input bg-background text-foreground hover:bg-muted hover:border-primary/30 hover:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-primary/10 hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
        subtle: 'bg-primary/10 text-primary hover:bg-primary/20',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded',
        sm: 'h-9 px-3 py-1 text-sm rounded',
        default: 'h-10 px-4 py-2 rounded-md',
        lg: 'h-11 px-6 py-2.5 rounded-md',
        xl: 'h-12 px-8 py-3 rounded-lg text-base',
        icon: {
          xs: 'h-7 w-7 rounded p-0',
          sm: 'h-9 w-9 rounded-md p-0',
          default: 'h-10 w-10 rounded-md p-0',
          lg: 'h-11 w-11 rounded-md p-0',
          xl: 'h-12 w-12 rounded-lg p-0',
        },
      },
      width: {
        default: '',
        full: 'w-full',
      },
    },
    compoundVariants: [
      {
        size: ['xs', 'sm', 'default', 'lg', 'xl'],
        width: 'full',
        class: 'w-full',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      width: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, width, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, width, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
