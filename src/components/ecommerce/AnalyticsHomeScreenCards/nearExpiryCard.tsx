import React, { useEffect, useState } from 'react';

/**
 * Expiry Risk — the exec-row card that replaced Return Rate %.
 *
 * Return Rate sat in this slot showing a hardcoded 0.0 behind a "Data N/A" veil: the
 * source has no return/credit-note rows at all, so it could never say anything. Worse,
 * the veil collapsed the card to zero height, leaving a hole in the row.
 *
 * Expiry risk earns the slot instead. It is the one inventory number on this page with
 * a DEADLINE — the other four (value, aging, cover, turnover) describe how much stock
 * there is and how fast it moves, none of which expires on a date. It is also the only
 * one where waiting has a guaranteed cost: stock that passes its expiry is written off
 * outright, not merely held longer. And it is distinct from the aging card beside it —
 * aging counts days since receipt, expiry counts days until the stamped date, and a
 * fast-moving item received last week can still expire next month.
 */
export interface NearExpiryCardProps {
  /** Cost value of everything expiring inside the 180-day window. */
  value: number;
  /** Distinct SKUs in that window. */
  skuCount: number;
  /** Already past its expiry date — a subset of `value`, and unrecoverable. */
  expiredValue?: number;
  /** Expiring within 30 days — still dispensable, so this is the actionable slice. */
  urgentValue?: number;
  /** Whole-portfolio stock value, to size the exposure against. */
  totalStockValue?: number;
  label?: string;
  location?: string;
  className?: string;
  animated?: boolean;
  /** Card-level controls (the material-category chip), rendered in the header. */
  headerSlot?: React.ReactNode;
}

const inr = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(1)} K`;
  return `₹${Math.round(v)}`;
};

const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const NearExpiryCard: React.FC<NearExpiryCardProps> = ({
  value,
  skuCount,
  expiredValue = 0,
  urgentValue = 0,
  totalStockValue = 0,
  label = 'Expiry Risk',
  location = 'All Plants',
  className = '',
  animated = true,
  headerSlot,
}) => {
  const [shown, setShown] = useState(animated ? 0 : value);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!animated) { setShown(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1600, 1);
      setShown(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animated]);

  // Expired money is gone; only the 0-30d slice can still be dispensed. Grading on the
  // RECOVERABLE portion keeps the badge honest — a card can't read "healthy" while
  // lakhs sit expired, and can't read "critical" over stock that is months away.
  const sharePct = totalStockValue > 0 ? (value / totalStockValue) * 100 : 0;
  const status = expiredValue > 0
    ? { text: 'Write-off pending', color: '#E11D48', bg: 'rgba(244,63,94,0.10)', ring: 'rgba(244,63,94,0.22)' }
    : urgentValue > 0
      ? { text: 'Act this month', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', ring: 'rgba(245,158,11,0.22)' }
      : { text: 'Nothing urgent', color: '#10B981', bg: 'rgba(16,185,129,0.10)', ring: 'rgba(16,185,129,0.22)' };

  // Three slabs of the same 180-day window, so the bar always sums to the headline.
  const laterValue = Math.max(value - expiredValue - urgentValue, 0);
  const pct = (v: number) => (value > 0 ? (v / value) * 100 : 0);

  return (
    <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl mx-auto">
      <div
        className={`relative w-full rounded-3xl overflow-hidden transition-all duration-700 backdrop-blur-xl border ${className}`}
        style={{
          background: 'linear-gradient(150deg, #FFF9F5 0%, #FFF1EC 55%, #FFE9E4 100%)',
          borderColor: 'rgba(244,63,94,0.14)',
          boxShadow: '0 10px 34px -18px rgba(120,40,30,0.28)',
          minHeight: 244,
        }}
      >
        <div className="absolute rounded-full blur-3xl pointer-events-none"
          style={{ width: 190, height: 190, background: '#ffd9cf', opacity: 0.5, top: -80, right: -50 }} />

        <div className="relative p-5">
          {/* header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2" style={{ color: status.color }}>
                <ClockIcon />
                <span className="text-[15px] font-bold tracking-tight" style={{ color: '#3b2b28' }}>{label}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 ml-0.5 text-xs" style={{ color: '#9a8a86' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                <span className="truncate">{location}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerSlot}
              <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: status.bg, color: status.color, border: `1px solid ${status.ring}` }}>
                {status.text}
              </span>
            </div>
          </div>

          {/* headline */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl lg:text-[42px] font-black leading-none tabular-nums"
              style={{ color: status.color }}>
              {inr(shown)}
            </span>
            <span className="text-[13px] font-semibold" style={{ color: '#9a8a86' }}>at risk</span>
          </div>
          <div className="mt-1.5 text-[11.5px]" style={{ color: '#9a8a86' }}>
            {/* "expired or expiring", not "expiring": a third of these lines are already
                past their date. Source frame runs -2312d to +178d. */}
            {skuCount.toLocaleString('en-IN')} SKUs expired or expiring within 180 days
            {sharePct > 0 && <> · <b style={{ color: '#6b5a56' }}>{sharePct.toFixed(1)}%</b> of stock value</>}
          </div>

          {/* the window, split by how much time is left */}
          <div className="mt-4 h-2.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(120,40,30,0.08)' }}>
            <div style={{ width: on ? `${pct(expiredValue)}%` : '0%', background: '#E11D48', transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }} />
            <div style={{ width: on ? `${pct(urgentValue)}%` : '0%', background: '#F59E0B', transition: 'width 1s cubic-bezier(0.22,1,0.36,1) 90ms' }} />
            <div style={{ width: on ? `${pct(laterValue)}%` : '0%', background: '#FCA5A5', transition: 'width 1s cubic-bezier(0.22,1,0.36,1) 180ms' }} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { l: 'Already expired', v: expiredValue, c: '#E11D48', note: 'unrecoverable' },
              { l: 'Within 30 days', v: urgentValue, c: '#F59E0B', note: 'still dispensable' },
              { l: '31–180 days', v: laterValue, c: '#d98a7d', note: 'plan ahead' },
            ].map((s) => (
              <div key={s.l} className="rounded-xl px-2.5 py-2"
                style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(120,40,30,0.07)' }}>
                <div className="text-[14px] font-bold tabular-nums leading-none" style={{ color: s.c }}>{inr(s.v)}</div>
                <div className="text-[9.5px] mt-1 leading-tight" style={{ color: '#9a8a86' }}>{s.l}</div>
                <div className="text-[8.5px] leading-tight" style={{ color: '#b7a6a2' }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NearExpiryCard;
