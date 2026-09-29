import { forwardRef, InputHTMLAttributes } from "react";
import { formControlClassName } from "@/src/components/ui/forms/styles";
import PasswordInput from "@/src/components/ui/PasswordInput";

type FormInputProps = InputHTMLAttributes<HTMLInputElement>;

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { className, ...props },
  ref,
) {
  const inputClassName = [formControlClassName, className].filter(Boolean).join(" ");

  return props.type === "password"
    ? <PasswordInput className={inputClassName} ref={ref} {...props} />
    : <input className={inputClassName} ref={ref} {...props} />;
});

export default FormInput;
