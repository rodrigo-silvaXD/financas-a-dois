import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...rest }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface border border-hairline shadow-sm p-4",
        interactive && "transition-transform duration-base ease-apple active:scale-[0.99] cursor-pointer",
        className,
      )}
      {...rest}
    />
  );
}
