"use client";
import dynamic from "next/dynamic";
const FormularyPage = dynamic(() => import("@/components/portfolio/formulary/FormularyPage"), { ssr: false });
export default function Page() {
  return <FormularyPage />;
}
