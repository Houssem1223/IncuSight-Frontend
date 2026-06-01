import type { ReactNode } from "react";

type SectionIntroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  className?: string;
  tone?: "light" | "dark";
};

export default function SectionIntro({
  eyebrow,
  title,
  description,
  className,
  tone = "light",
}: SectionIntroProps) {
  const wrapperClassName = ["max-w-3xl", className].filter(Boolean).join(" ");
  const eyebrowClassName =
    tone === "dark"
      ? "font-mono text-xs uppercase tracking-[0.2em] text-[#FBBF24]"
      : "font-mono text-xs uppercase tracking-[0.2em] text-brand-strong";
  const titleClassName =
    tone === "dark"
      ? "mt-3 text-2xl font-semibold tracking-tight text-white md:text-4xl"
      : "mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-4xl";
  const descriptionClassName =
    tone === "dark"
      ? "mt-3 text-sm leading-relaxed text-slate-200 md:text-base"
      : "mt-3 text-sm leading-relaxed text-foreground-muted md:text-base";

  return (
    <header className={wrapperClassName}>
      <p className={eyebrowClassName}>{eyebrow}</p>
      <h2 className={titleClassName}>{title}</h2>
      <p className={descriptionClassName}>{description}</p>
    </header>
  );
}
