import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BidEasy Analytics AI",
  description: "AI Analytics Application",
};

export default function SignIn() {
  return <SignInForm />;
}
