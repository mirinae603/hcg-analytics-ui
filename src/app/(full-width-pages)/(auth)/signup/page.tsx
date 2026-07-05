import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BidEasy Analytics AI",
  description: "AI Analytics Application",
};

export default function SignUp() {
  return <SignUpForm />;
}
