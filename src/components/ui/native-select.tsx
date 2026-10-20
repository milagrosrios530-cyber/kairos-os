import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-input bg-white px-3 pr-9 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-input/40 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
          className,
        )}
        data-slot="native-select"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}

export { NativeSelect };
