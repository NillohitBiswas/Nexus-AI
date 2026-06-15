import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style of the button.
   * "primary" – filled primary color
   * "secondary" – outline style
   * "danger" – red destructive action
   * "ghost" – minimal background
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Show a loading spinner and disable the button */
  isLoading?: boolean;
}

const baseClasses =
  'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-150 ease-in-out transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

const variantClasses: Record<Required<ButtonProps>["variant"], string> = {
  primary:
    'bg-linear-to-r from-red-600 to-red-700 text-white shadow-md hover:from-red-500 hover:to-red-600 focus-visible:ring-red-400',
  secondary:
    'border border-zinc-800 text-zinc-100 bg-zinc-900 hover:bg-zinc-800 focus-visible:ring-zinc-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost: 'bg-transparent text-zinc-100 hover:bg-zinc-800',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, isLoading, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || isLoading;
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className ?? ''}`}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
