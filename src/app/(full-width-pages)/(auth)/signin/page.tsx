import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { OWNER, PRODUCT } from "@/utils/brand";

export const metadata: Metadata = {
  title: "Sign in",
  description: `${OWNER} ${PRODUCT.name}.`,
};

export default function SignIn() {
  return <SignInForm />;
}
