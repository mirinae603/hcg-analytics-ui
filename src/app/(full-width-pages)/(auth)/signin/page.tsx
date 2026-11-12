import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "HCG Hospitals Supply Chain Analytics.",
};

export default function SignIn() {
  return <SignInForm />;
}
