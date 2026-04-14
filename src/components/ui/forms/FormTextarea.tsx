import { forwardRef, TextareaHTMLAttributes } from "react";
import { formControlClassName } from "@/src/components/ui/forms/styles";

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  { className, ...props },
  ref,
) {
  const textareaClassName = [
    formControlClassName,
    "min-h-28 resize-y",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <textarea className={textareaClassName} ref={ref} {...props} />;
});

export default FormTextarea;
