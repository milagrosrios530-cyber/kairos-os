"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = ComponentProps<typeof Input>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        className={cn("h-11 rounded-xl bg-white pr-11", className)}
        type={visible ? "text" : "password"}
        {...props}
      />
      <Button
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((current) => !current)}
        size="icon"
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        type="button"
        variant="ghost"
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );
}
