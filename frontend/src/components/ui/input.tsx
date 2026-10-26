import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => <input type={type} className={cn("flex h-11 w-full rounded-control border border-brand-border bg-white px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-light disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />);
Input.displayName = "Input";
