"use client";

import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`block w-full rounded-lg border border-zinc-900 bg-black px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50 ${className ?? ""}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
