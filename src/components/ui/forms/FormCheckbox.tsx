import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

type FormCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: ReactNode;
};

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(function FormCheckbox(
  { label, hint, className, ...props },
  ref,
) {
  const wrapperClassName = [
    "inline-flex w-full items-start gap-2 rounded-xl border border-border/80 bg-white/95 px-3 py-2.5 text-sm text-foreground",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={wrapperClassName}>
      <input
        className="mt-0.5 h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
        ref={ref}
        type="checkbox"
        {...props}
      />

      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-foreground-muted">{hint}</span>}
      </span>
    </label>
  );
});

export default FormCheckbox;
