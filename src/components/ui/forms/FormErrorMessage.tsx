import { ReactNode } from "react";

type FormErrorMessageProps = {
  message?: ReactNode;
  className?: string;
};

export default function FormErrorMessage({ message, className }: FormErrorMessageProps) {
  if (!message) {
    return null;
  }

  const wrapperClassName = [
    "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <p className={wrapperClassName}>{message}</p>;
}
