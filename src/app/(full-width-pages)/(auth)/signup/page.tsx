import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "HCG Hospitals Supply Chain Analytics.",
};

export default function SignUp() {
  return <SignUpForm />;
}
