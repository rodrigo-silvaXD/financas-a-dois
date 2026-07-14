import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-2">
      {label && (
        <span className="text-bodysm text-ink-muted font-medium">{label}</span>
      )}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          "h-12 w-full rounded-lg bg-surface-muted px-4 text-body text-ink",
          "placeholder:text-ink-subtle",
          "outline-none border border-transparent",
          "focus:border-brand focus:bg-surface transition-colors duration-base ease-apple",
          error && "border-danger focus:border-danger",
          className,
        )}
        {...rest}
      />
      {(hint || error) && (
        <span className={cn("text-caption", error ? "text-danger" : "text-ink-subtle")}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
});
