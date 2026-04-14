import { forwardRef, InputHTMLAttributes } from "react";
import FormInput from "@/src/components/ui/forms/FormInput";

type FormDateTimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const FormDateTimeInput = forwardRef<HTMLInputElement, FormDateTimeInputProps>(
  function FormDateTimeInput(props, ref) {
    return <FormInput ref={ref} type="datetime-local" {...props} />;
  },
);

export default FormDateTimeInput;
