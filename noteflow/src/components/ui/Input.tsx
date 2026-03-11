import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-user outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:bg-zinc-900",
        className,
      )}
      {...props}
    />
  );
});

export default Input;
