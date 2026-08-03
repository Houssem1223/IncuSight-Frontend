import { redirect } from "next/navigation";
import { LANDING_LOGIN_ROUTE } from "@/src/lib/auth-routing";

export default function LoginPage() {
  redirect(LANDING_LOGIN_ROUTE);
}
