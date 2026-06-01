import * as React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>;

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, ...props },
  ref,
) {
  const classes = [
    "inline-flex items-center gap-1 rounded-full border border-[#F97316]/20 bg-[#F97316]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F97316]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span ref={ref} className={classes} {...props} />;
});

export { Badge };
