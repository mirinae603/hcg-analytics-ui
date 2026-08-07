"use client";
// OP / IP Revenue Contribution — "TWO ENGINES, ONE RATE AXIS".
//
// This is a TWELVE-ROW dataset and one of the two shares is 8.35%. A donut would render the
// entire outpatient story as an unreadable sliver, so the weight is stated ONCE — a 12px
// rail and two numbers — and the rest of the page is spent where IP and OP are the SAME
// size: a margin-rate axis. The question worth asking is not "is IP bigger" (it is, by 11x)
// but "does the small channel earn at the same rate", and "is either drifting".
//
// 12 rows is the COMPLETE patient-type split the billing extract carries, not a sample.
// Deliberately absent: material, hospital, category or manufacturer cuts — none exist here.
// The rate axis is NOT zoomed: a near-flat rate must read as near-flat.
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { DASHBOARD_API_BASE_URL } from "@/utils/config";
import { byKey } from "@/lib/kpiRegistry";
import {
  PageShell, HeroShell, Card, Head, Readout, Skeleton, useArmed,
  INK, SUB, RULE, LINE, CARD, GRAPHITE, JADE, JADE_DEEP, SEA, BRASS,
  inr, pct1, num, EASE, EASE_OUT,
} from "./kit";

const KpiTable = dynamic(() => import("../KpiTable"), { ssr: false, loading: () => <div className="p-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse mb-2" />)}</div> });
const MN: Record<string, string> = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };

export default function OpIpRevenueDetail() {
  const on = useArmed();
  const [raw, setRaw] = useState<any[] | null>(null);
  const [hi, setHi] = useState<number | null>(null);
  const kpi = byKey("op-ip-revenue");

  useEffect(() => {
    fetch(`${DASHBOARD_API_BASE_URL}/kpi/op-ip-revenue/table?page=0&page_size=50`)
      .then((r) => r.json()).then((d) => setRaw(d?.data || [])).catch(() => setRaw([]));
  }, []);

  const M = useMemo(() => {
    if (!raw) return null;
    const months = [...new Set(raw.map((r) => String(r.month)))].sort();
    const at = (p: string, m: string) => raw.find((r) => r.patient === p && String(r.month) === m) || {};
    const rows = months.map((m) => {
      const ip = at("IP", m), op = at("OP", m);
      const ipr = Number(ip.revenue || 0), ipc = Number(ip.cost || 0);
      const opr = Number(op.revenue || 0), opc = Number(op.cost || 0);
      return {
        month: m, label: MN[m.slice(5, 7)] || m,
        ipr, opr, ipRate: ipr ? ((ipr - ipc) / ipr) * 100 : null, opRate: opr ? ((opr - opc) / opr) * 100 : null,
        ipm: ipr - ipc, opm: opr - opc,
      };
    });
    const s = (k: string) => raw.filter((r) => r.patient === k).reduce((a, r) => a + Number(r.revenue || 0), 0);
    const c = (k: string) => raw.filter((r) => r.patient === k).reduce((a, r) => a + Number(r.cost || 0), 0);
    const IPR = s("IP"), OPR = s("OP"), IPC = c("IP"), OPC = c("OP");
    const tot = IPR + OPR;
    return {
      rows, IPR, OPR, IPC, OPC, tot,
      ipShare: tot ? (IPR / tot) * 100 : 0, opShare: tot ? (OPR / tot) * 100 : 0,
      ipRate: IPR ? ((IPR - IPC) / IPR) * 100 : 0, opRate: OPR ? ((OPR - OPC) / OPR) * 100 : 0,
      bookRate: tot ? ((tot - IPC - OPC) / tot) * 100 : 0,
    };
  }, [raw]);

  if (!M) return <PageShell title="OP / IP revenue contribution" sub="inpatient vs outpatient — weight, and whether the small channel earns as well" pill="12 rows"><Skeleton /></PageShell>;

  const W = 900, H = 300, PL = 52, PR = 90, PT = 24, PB = 46;
  const PW = W - PL - PR, PH = H - PT - PB;
  const n = M.rows.length || 1, slotW = PW / n;
  // rate axis anchored at 0 with a fixed ceiling — never zoomed to manufacture drama
  const YMAX = Math.max(50, Math.ceil(Math.max(M.ipRate, M.opRate, ...M.rows.flatMap((r) => [r.ipRate || 0, r.opRate || 0])) / 10) * 10);
  const Y = (p: number) => PT + PH - (p / YMAX) * PH;
  const steps = (key: "ipRate" | "opRate") => {
    const seg: string[] = [];
    M.rows.forEach((r, i) => {
      const v = r[key]; if (v == null) return;
      const x0 = PL + i * slotW, x1 = x0 + slotW;
      seg.push(`M${x0},${Y(v)} L${x1},${Y(v)}`);
      const prev = M.rows[i - 1]?.[key];
      if (i > 0 && prev != null) seg.push(`M${x0},${Y(prev)} L${x0},${Y(v)}`);
    });
    return seg.join(" ");
  };
  const a = hi != null ? M.rows[hi] : null;

  return (
    <PageShell title="OP / IP revenue contribution"
      sub="inpatient vs outpatient — weight stated once, then quality"
      pill={`${M.rows.length} months · complete split`}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">

        <div className="xl:col-span-12">
          <HeroShell>
            {/* WEIGHT — said once, plainly, and never again */}
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <div className="text-[10px] font-semibold uppercase" style={{ color: SUB, letterSpacing: ".14em" }}>Billed revenue · {M.rows.length} months</div>
                <div className="mt-2 text-[40px] font-light tabular-nums leading-none" style={{ color: INK, letterSpacing: "-.03em" }}>{inr(M.tot)}</div>
              </div>
              <div className="flex items-end gap-8">
                <div><div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: JADE }}>{inr(M.IPR)}</div>
                  <div className="text-[10.5px] uppercase tracking-wide mt-1.5" style={{ color: SUB }}>Inpatient · {pct1(M.ipShare)}</div></div>
                <div style={{ borderLeft: `1px solid ${RULE}`, paddingLeft: 32 }}>
                  <div className="text-[19px] font-bold tabular-nums leading-none" style={{ color: SEA }}>{inr(M.OPR)}</div>
                  <div className="text-[10.5px] uppercase tracking-wide mt-1.5" style={{ color: SUB }}>Outpatient · {pct1(M.opShare)}</div></div>
              </div>
            </div>
            <div className="flex mt-4 rounded-full overflow-hidden" style={{ height: 12 }}>
              <div style={{ width: on ? `${M.ipShare}%` : "0%", background: JADE, transition: `width 760ms ${EASE_OUT} 160ms` }} />
              <div style={{ width: 1, background: CARD }} />
              <div style={{ width: on ? `${M.opShare}%` : "0%", background: SEA, transition: `width 760ms ${EASE_OUT} 160ms` }} />
            </div>
            <p className="text-[11.5px] mt-3 leading-relaxed max-w-2xl" style={{ color: SUB }}>
              That rail is the whole weight story — inpatient bills <b style={{ color: INK }}>{(M.IPR / (M.OPR || 1)).toFixed(1)}×</b> what
              outpatient does. It is not asked again below. The plot puts both channels on the
              <b style={{ color: INK }}> same rate axis</b>, where they are the same size and the real question is visible:
              outpatient turns <b style={{ color: SEA }}>{pct1(M.opRate)}</b> against inpatient&apos;s <b style={{ color: JADE_DEEP }}>{pct1(M.ipRate)}</b>.
            </p>

            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto", marginTop: 14, cursor: "crosshair" }} preserveAspectRatio="xMidYMid meet"
              onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHi(Math.max(0, Math.min(n - 1, Math.floor((x - PL) / slotW)))); }}
              onMouseLeave={() => setHi(null)} role="img" aria-label="Inpatient and outpatient margin rate by month, on one axis">
              {[0, 10, 20, 30, 40, 50].filter((g) => g <= YMAX && Math.abs(Y(g) - Y(M.bookRate)) > 9).map((g) => (
                <g key={g}><line x1={PL} y1={Y(g)} x2={W - PR} y2={Y(g)} stroke={LINE} strokeWidth="1" />
                  <text x={PL - 8} y={Y(g) + 3.5} textAnchor="end" style={{ fontSize: 9.5, fill: SUB }}>{g}%</text></g>
              ))}
              <line x1={PL} y1={Y(M.bookRate)} x2={W - PR} y2={Y(M.bookRate)} stroke={BRASS} strokeWidth="1.2" strokeDasharray="5 4"
                style={{ opacity: on ? 1 : 0, transition: "opacity 400ms ease 800ms" }} />
              <text x={W - PR + 8} y={Y(M.bookRate) + 3.5} style={{ fontSize: 10, fontWeight: 700, fill: BRASS, opacity: on ? 1 : 0, transition: "opacity 400ms ease 800ms" }}>book {pct1(M.bookRate)}</text>
              {hi != null && <line x1={PL + hi * slotW + slotW / 2} y1={PT} x2={PL + hi * slotW + slotW / 2} y2={PT + PH} stroke="rgba(22,32,28,.26)" strokeWidth="1" />}
              {([["opRate", SEA], ["ipRate", JADE]] as const).map(([k, c]) => (
                <path key={k} d={steps(k)} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 1000ms ${EASE} 420ms` }} />
              ))}
              <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke={INK} strokeWidth="1" />
              {M.rows.map((r, i) => (
                <text key={r.month} x={PL + i * slotW + slotW / 2} y={PT + PH + 20} textAnchor="middle"
                  style={{ fontSize: 10.5, fontWeight: hi === i ? 700 : 500, fill: hi === i ? INK : SUB }}>{r.label}</text>
              ))}
              <text x={W - PR + 8} y={Y(M.ipRate) - 6} style={{ fontSize: 10, fontWeight: 700, fill: JADE_DEEP }}>IP</text>
              <text x={W - PR + 8} y={Y(M.opRate) + 12} style={{ fontSize: 10, fontWeight: 700, fill: SEA }}>OP</text>
              <text x={PL} y={H - 8} style={{ fontSize: 9.5, fill: SUB }}>margin rate per channel · axis from 0, never zoomed</text>
            </svg>
            <Readout k={hi} dark>
              {a ? (
                <span><b>{a.label}</b> — IP <b style={{ color: JADE_DEEP }}>{a.ipRate != null ? pct1(a.ipRate) : "—"}</b> on {inr(a.ipr)}
                  · OP <b style={{ color: SEA }}>{a.opRate != null ? pct1(a.opRate) : "—"}</b> on {inr(a.opr)}
                  <span style={{ color: SUB }}> · gap {a.ipRate != null && a.opRate != null ? `${(a.ipRate - a.opRate) >= 0 ? "+" : "−"}${Math.abs(a.ipRate - a.opRate).toFixed(1)} pts` : "—"}</span></span>
              ) : <span style={{ color: SUB }}>hover a month — both channels are the same size on this axis</span>}
            </Readout>
          </HeroShell>
        </div>

        {/* ── S1 — where the rupees actually land, month by month ── */}
        <div className="xl:col-span-7">
          <Card delay={180}>
            <Head label="Monthly billed revenue, by channel"
              note="Stacked because the two channels sum to the month's billed total — the one place adding them is legitimate."
              badge={`${M.rows.length} months`} />
            <Stack rows={M.rows} on={on} />
          </Card>
        </div>

        {/* ── S2 — the gap itself ── */}
        <div className="xl:col-span-5">
          <Card delay={260}>
            <Head label="The quality gap"
              note="Inpatient rate minus outpatient rate, in points, per month. Above zero = inpatient earns better."
              badge="points, not rupees" />
            <Gap rows={M.rows} on={on} />
          </Card>
        </div>

        <div className="xl:col-span-12">
          <Card delay={340} className="!p-0">
            <div className="p-5 md:p-6 pb-0"><Head label="Patient type × month" note="The complete split the billing extract carries · export CSV" badge="12 rows" /></div>
            <div className="-mt-2">{kpi && <KpiTable kpiKey="op-ip-revenue" columns={kpi.columns} />}</div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Stack({ rows, on }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 620, H = 250, PL = 52, PR = 16, PT = 18, PB = 40;
  const PW = W - PL - PR, PH = H - PT - PB, n = rows.length, slotW = PW / n, bw = Math.min(slotW * 0.56, 46);
  const max = Math.max(...rows.map((r: any) => r.ipr + r.opr), 1);
  const a = hi != null ? rows[hi] : null;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: "auto" }} preserveAspectRatio="xMidYMid meet"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHi(Math.max(0, Math.min(n - 1, Math.floor((x - PL) / slotW)))); }}
        onMouseLeave={() => setHi(null)}>
        {[0, .5, 1].map((f) => (
          <g key={f}><line x1={PL} y1={PT + PH - f * PH} x2={W - PR} y2={PT + PH - f * PH} stroke={LINE} strokeWidth="1" />
            <text x={PL - 8} y={PT + PH - f * PH + 3.5} textAnchor="end" style={{ fontSize: 9, fill: SUB }}>{inr(max * f)}</text></g>
        ))}
        {rows.map((r: any, i: number) => {
          const tot = r.ipr + r.opr, hIP = (r.ipr / max) * PH, hOP = (r.opr / max) * PH;
          const x = PL + i * slotW + slotW / 2 - bw / 2, act = hi === i;
          return (
            <g key={r.month} style={{ opacity: hi == null || act ? 1 : 0.42, transition: "opacity 170ms" }}>
              <rect x={x} y={on ? PT + PH - hIP : PT + PH} width={bw} height={on ? hIP : 0} fill={JADE}
                style={{ transition: `y 640ms ${EASE} ${120 + i * 50}ms, height 640ms ${EASE} ${120 + i * 50}ms` }} />
              <rect x={x} y={on ? PT + PH - hIP - hOP : PT + PH} width={bw} height={on ? hOP : 0} fill={SEA}
                style={{ transition: `y 640ms ${EASE} ${120 + i * 50}ms, height 640ms ${EASE} ${120 + i * 50}ms` }} />
              <text x={x + bw / 2} y={PT + PH + 18} textAnchor="middle" style={{ fontSize: 10, fontWeight: act ? 700 : 500, fill: act ? INK : SUB }}>{r.label}</text>
            </g>
          );
        })}
        <line x1={PL} y1={PT + PH} x2={W - PR} y2={PT + PH} stroke={INK} strokeWidth="1" />
      </svg>
      <Readout k={hi} minH={34}>
        {a ? <span><b>{a.label}</b> — total {inr(a.ipr + a.opr)} · IP {inr(a.ipr)} <span style={{ color: SUB }}>({pct1((a.ipr / (a.ipr + a.opr)) * 100)})</span> · OP {inr(a.opr)}</span>
          : <span style={{ color: SUB }}>jade = inpatient · sea = outpatient</span>}
      </Readout>
    </>
  );
}

function Gap({ rows, on }: any) {
  const [hi, setHi] = useState<number | null>(null);
  const gaps = rows.map((r: any) => (r.ipRate != null && r.opRate != null ? r.ipRate - r.opRate : null));
  const max = Math.max(...gaps.map((g: any) => Math.abs(g || 0)), 1) * 1.15;
  const a = hi != null ? rows[hi] : null;
  return (
    <>
      <div className="mt-1">
        {rows.map((r: any, i: number) => {
          const g = gaps[i]; if (g == null) return null;
          const w = (Math.abs(g) / max) * 46;
          return (
            <div key={r.month} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
              className="flex items-center gap-2 py-[5px]" style={{ opacity: hi != null && hi !== i ? 0.45 : 1, transition: "opacity 160ms" }}>
              <span className="text-[11px] w-[34px] flex-shrink-0" style={{ color: INK }}>{r.label}</span>
              <div className="relative flex-1 h-[13px]">
                <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: RULE }} />
                <span style={{
                  position: "absolute", top: 3, height: 7, borderRadius: 1,
                  left: g >= 0 ? "50%" : `${50 - (on ? w : 0)}%`, width: on ? `${w}%` : "0%",
                  background: g >= 0 ? JADE : GRAPHITE,
                  transition: `width 620ms ${EASE} ${140 + i * 50}ms, left 620ms ${EASE} ${140 + i * 50}ms`,
                }} />
              </div>
              <span className="text-[11px] w-[46px] text-right flex-shrink-0 tabular-nums font-semibold" style={{ color: g >= 0 ? JADE_DEEP : GRAPHITE }}>
                {g >= 0 ? "+" : "−"}{Math.abs(g).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <Readout k={hi} minH={34}>
        {a && a.ipRate != null && a.opRate != null
          ? <span><b>{a.label}</b> — IP {pct1(a.ipRate)} vs OP {pct1(a.opRate)} · inpatient earns <b style={{ color: (a.ipRate - a.opRate) >= 0 ? JADE_DEEP : GRAPHITE }}>{Math.abs(a.ipRate - a.opRate).toFixed(1)} pts</b> {(a.ipRate - a.opRate) >= 0 ? "more" : "less"}</span>
          : <span style={{ color: SUB }}>centre line = parity between the two channels</span>}
      </Readout>
    </>
  );
}
