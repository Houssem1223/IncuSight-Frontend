import * as React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref,
) {
  const classes = [
    "rounded-2xl border border-border bg-white shadow-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div ref={ref} className={classes} {...props} />;
});

const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  const classes = ["flex flex-col gap-2 p-6", className]
    .filter(Boolean)
    .join(" ");

  return <div ref={ref} className={classes} {...props} />;
});

const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(function CardContent(
  { className, ...props },
  ref,
) {
  const classes = ["px-6 pb-6", className].filter(Boolean).join(" ");

  return <div ref={ref} className={classes} {...props} />;
});

const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  const classes = ["px-6 pb-6", className].filter(Boolean).join(" ");

  return <div ref={ref} className={classes} {...props} />;
});

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, ...props },
  ref,
) {
  const classes = ["text-lg font-semibold text-foreground", className]
    .filter(Boolean)
    .join(" ");

  return <h3 ref={ref} className={classes} {...props} />;
});

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  function CardDescription({ className, ...props }, ref) {
    const classes = ["text-sm text-foreground-muted", className]
      .filter(Boolean)
      .join(" ");

    return <p ref={ref} className={classes} {...props} />;
  },
);

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
