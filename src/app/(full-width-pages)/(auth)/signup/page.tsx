import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";
import { OWNER, PRODUCT } from "@/utils/brand";

export const metadata: Metadata = {
  title: "Create account",
  description: `${OWNER} ${PRODUCT.name}.`,
};

export default function SignUp() {
  return <SignUpForm />;
}
