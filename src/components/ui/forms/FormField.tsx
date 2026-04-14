import { ReactNode } from "react";
import {
  formFieldErrorClassName,
  formHintClassName,
  formLabelClassName,
} from "@/src/components/ui/forms/styles";

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function FormField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const wrapperClassName = ["space-y-2", className].filter(Boolean).join(" ");

  return (
    <div className={wrapperClassName}>
      <div className="flex items-center gap-1.5">
        <label className={formLabelClassName} htmlFor={htmlFor}>
          {label}
        </label>
        {required && <span className="text-xs text-brand-strong"></span>}
      </div>

      {hint && <p className={formHintClassName}>{hint}</p>}

      {children}

      {error && <p className={formFieldErrorClassName}>{error}</p>}
    </div>
  );
}
