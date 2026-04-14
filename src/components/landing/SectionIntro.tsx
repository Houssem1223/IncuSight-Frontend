import type { ReactNode } from "react";

type SectionIntroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  className?: string;
};

export default function SectionIntro({
  eyebrow,
  title,
  description,
  className,
}: SectionIntroProps) {
  const wrapperClassName = ["max-w-3xl", className].filter(Boolean).join(" ");

  return (
    <header className={wrapperClassName}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-strong">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-foreground-muted md:text-base">{description}</p>
    </header>
  );
}
