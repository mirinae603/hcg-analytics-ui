import KpiKeyClient from "./KpiKeyClient";
import { KPIS } from "@/lib/kpiRegistry";
import { SIMULATED_KPIS } from "@/lib/kpiRegistry";

// Static export needs every possible [key] value enumerated at build time —
// there's no server left at runtime to resolve an arbitrary one.
export async function generateStaticParams() {
  return [...KPIS.map((k) => k.key), ...SIMULATED_KPIS.map((k) => k.key)].map((key) => ({ key }));
}

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <KpiKeyClient kpiKey={key} />;
}
