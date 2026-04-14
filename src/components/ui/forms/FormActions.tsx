import { ReactNode } from "react";

type FormActionsProps = {
  children: ReactNode;
  align?: "start" | "end" | "between";
  className?: string;
};

const alignClassNameByMode: Record<NonNullable<FormActionsProps["align"]>, string> = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

export default function FormActions({
  children,
  align = "end",
  className,
}: FormActionsProps) {
  const wrapperClassName = [
    "flex flex-wrap items-center gap-2 pt-1",
    alignClassNameByMode[align],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={wrapperClassName}>{children}</div>;
}
