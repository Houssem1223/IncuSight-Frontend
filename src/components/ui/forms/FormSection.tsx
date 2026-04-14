import { ReactNode } from "react";

type FormSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function FormSection({
  title,
  description,
  className,
  children,
}: FormSectionProps) {
  const sectionClassName = ["space-y-3", className].filter(Boolean).join(" ");

  return (
    <section className={sectionClassName}>
      {(title || description) && (
        <header>
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {description && <p className="mt-1 text-xs text-foreground-muted">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
