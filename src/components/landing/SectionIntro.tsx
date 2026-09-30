import type { ReactNode } from "react";

type SectionIntroProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  className?: string;
};

// En-tete commun des sections de la landing ; `id` sert d'aria-labelledby.
export default function SectionIntro({
  id,
  eyebrow,
  title,
  description,
  align = "start",
  className,
}: SectionIntroProps) {
  const centered = align === "center";

  return (
    <div
      className={["max-w-2xl", centered ? "mx-auto text-center" : "", className].filter(Boolean).join(" ")}
      data-reveal
    >
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2
        className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-4xl md:text-[2.6rem]"
        id={id}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-ink/60 md:text-lg">{description}</p>
      )}
    </div>
  );
}
