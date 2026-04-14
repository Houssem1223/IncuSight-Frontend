import { SelectHTMLAttributes, forwardRef } from "react";
import { formControlClassName } from "@/src/components/ui/forms/styles";

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect(
  { className, ...props },
  ref,
) {
  const selectClassName = [formControlClassName, className].filter(Boolean).join(" ");

  return <select className={selectClassName} ref={ref} {...props} />;
});

export default FormSelect;
