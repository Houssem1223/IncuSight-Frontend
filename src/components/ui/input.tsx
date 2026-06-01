import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  const classes = [
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#0F172A] shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input ref={ref} className={classes} {...props} />;
});

export { Input };
