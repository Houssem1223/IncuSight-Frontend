import * as React from "react";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  indicatorClassName?: string;
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { className, indicatorClassName, value = 0, ...props },
  ref,
) {
  const clamped = Math.min(100, Math.max(0, value));
  const wrapperClasses = [
    "h-2 w-full overflow-hidden rounded-full bg-slate-200/70",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const indicatorClasses = [
    "h-full rounded-full transition-all duration-300",
    indicatorClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={wrapperClasses} {...props}>
      <div className={indicatorClasses} style={{ width: `${clamped}%` }} />
    </div>
  );
});

export { Progress };
