"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;                          // reais (1234.56)
  onChange: (v: number) => void;
  label?: string;
  hint?: string;
  error?: string;
  large?: boolean;                        // input maior (form principal de valor)
}

/**
 * Digitação em modo "centavos": só aceita dígitos, os 2 últimos são centavos.
 *  "" → R$ 0,00 · "1" → R$ 0,01 · "20" → R$ 0,20 · "2000" → R$ 20,00
 * Backspace vira 20000 → 2000 (R$ 20,00).
 */
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(function CurrencyInput(
  { value, onChange, label, hint, error, large, className, id, name, ...rest },
  ref,
) {
  const display = formatBRL(value || 0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    const cents = digits ? Number(digits) : 0;
    onChange(cents / 100);
  }

  return (
    <label htmlFor={id ?? name} className="flex flex-col gap-2">
      {label && <span className="text-bodysm text-ink-muted font-medium">{label}</span>}
      <input
        id={id ?? name}
        name={name}
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
        className={cn(
          "w-full rounded-lg bg-surface-muted px-4 text-ink text-right",
          "outline-none border border-transparent",
          "focus:border-brand focus:bg-surface transition-colors duration-base ease-apple",
          large ? "h-16 text-display font-bold" : "h-12 text-body",
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
