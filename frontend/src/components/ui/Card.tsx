import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

/** Corner 20px (rounded-2xl), padding 20px (p-5) por default. */
export function Card({ interactive, className, ...rest }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border border-hairline shadow-sm p-5",
        interactive && [
          "cursor-pointer transition-all duration-base ease-apple",
          "active:scale-[0.98] active:opacity-90",
        ],
        className,
      )}
      {...rest}
    />
  );
}
