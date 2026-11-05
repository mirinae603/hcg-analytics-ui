import Link from "next/link";
import Image from "next/image";
import React from "react";
import { CLIENT, OWNER, PRODUCT } from "@/utils/brand";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center" style={{ background: "#f6f7f9" }}>
      {CLIENT
        ? <Image src={CLIENT.logo} alt={CLIENT.name} width={116} height={58} className="mb-9 opacity-90" unoptimized />
        : <Image src={PRODUCT.icon} alt={PRODUCT.vendor} width={58} height={58} className="mb-9 rounded-xl opacity-90" unoptimized />}
      <div className="text-[64px] font-extrabold leading-none tracking-tight" style={{ color: "#1b1c22" }}>404</div>
      <p className="mt-3 text-[15px] max-w-sm leading-relaxed" style={{ color: "#8a8f9d" }}>
        This page doesn&apos;t exist — it may have moved, or the link is out of date.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        style={{ background: "#1b1c22" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to home
      </Link>
      <p className="mt-12 text-[12px]" style={{ color: "#b3b8c6" }}>{CLIENT ? `${CLIENT.name} Hospitals` : OWNER} · {PRODUCT.name}</p>
    </div>
  );
}
