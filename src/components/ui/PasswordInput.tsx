"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(
  { className = "", id, disabled, ...props }, ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative w-full">
      <input {...props} ref={ref} id={inputId} disabled={disabled} type={visible ? "text" : "password"} className={`${className} pr-12`} />
      <button type="button" aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-controls={inputId} aria-pressed={visible} disabled={disabled}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        onClick={() => setVisible(current => !current)}>
        {visible ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
      </button>
    </div>
  );
});

export default PasswordInput;
