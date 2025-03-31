import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background text-foreground transition-all ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        xs: "h-7 px-2 py-1 text-xs",
        sm: "h-9 px-3 py-1 text-sm",
        default: "h-10 px-3 py-2 text-sm",
        lg: "h-11 px-4 py-2 text-base",
        xl: "h-12 px-4 py-3 text-base",
      },
      variant: {
        default: "border-input",
        ghost: "border-transparent bg-transparent",
        muted: "border-transparent bg-muted",
        inverted: "bg-primary/10 border-primary/20",
        outline: "border-2",
        bottomBorder: "border-0 border-b-2 rounded-none px-0",
      },
      state: {
        default: "",
        success: "border-success/50 focus-visible:ring-success/30",
        error: "border-destructive/50 focus-visible:ring-destructive/30",
        warning: "border-warning/50 focus-visible:ring-warning/30",
      },
      withIcon: {
        default: "",
        left: "pl-9",
        right: "pr-9",
        both: "pl-9 pr-9",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      state: "default",
      withIcon: "default",
    },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const InputWrapper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative", className)} {...props} />
));
InputWrapper.displayName = "InputWrapper";

const InputIcon = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "absolute bottom-0 top-0 flex items-center justify-center text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
InputIcon.displayName = "InputIcon";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      size,
      variant,
      state,
      withIcon,
      leftIcon,
      rightIcon,
      ...props
    },
    ref,
  ) => {
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;
    const iconSetting =
      hasLeftIcon && hasRightIcon
        ? "both"
        : hasLeftIcon
          ? "left"
          : hasRightIcon
            ? "right"
            : "default";

    if (hasLeftIcon || hasRightIcon) {
      return (
        <InputWrapper className={className}>
          {hasLeftIcon && <InputIcon className="left-3">{leftIcon}</InputIcon>}
          <input
            type={type}
            className={cn(
              inputVariants({
                size,
                variant,
                state,
                withIcon: iconSetting,
                className: "relative",
              }),
            )}
            ref={ref}
            {...props}
          />
          {hasRightIcon && (
            <InputIcon className="right-3">{rightIcon}</InputIcon>
          )}
        </InputWrapper>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ size, variant, state, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, InputIcon, InputWrapper };
