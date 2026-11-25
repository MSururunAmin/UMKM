import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => <input type={type} className={cn("flex h-11 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-brand-secondary focus:ring-4 focus:ring-brand-light/80 disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />);
Input.displayName = "Input";
