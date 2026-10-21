"use client";
// Spend Analysis — the Summary: HCG's KR spend mail on ONE screen of charts, the way HCG's own
// Power BI dashboards (and the hospital spend dashboards it pointed to) show theirs. Seven
// panels, each a chart whose key figures are its labels in lakhs; a click opens the drawer with
// the written summary, exact rupees, every month, every hospital, the splits and the method,
// and from there a link leads to the section with the full brand and doctor tables.
//
//   r1  Margin missed, by part                 | Margin missed by month (cash & insurance patients, incl. out-of-formulary brands)
//   r2  Margin possible vs earned     | Where margin was missed | Margin missed by hospital / where it stands
//   r3  Top brand switches                                 | Scheme: margin missed by month
//
// It reads the sections' own overviews (cash & TPA, which carries HCG's combined cash and
// out-of-formulary table; scheme, which carries the Attis and Healthium slices; out of
// formulary for its drawer and brands), so every figure here is the one the section shows.
// Each section counts its own payers: scheme figures are GOV patients, cash and out of
// formulary CASH and CASH(TPA), whatever payer another section had picked.
import React, { useState } from "react";
import { OneScreenGrid, type Place } from "@/components/portfolio/ledger/onescreen";
import { DrawerSection, type DrawerTab } from "@/components/portfolio/ledger/DetailDrawer";
import { pct } from "@/components/portfolio/ledger/format";
import { Notice } from "../../formulary/parts";
import { sectionParams, useOverview, type CashOverview, type Filters, type Meta, type OofOverview, type Overview } from "../api";
import { KIND, marginSection, schemeSection, spendLoss, subLoss, whenOf, whereOf, type LossRow } from "./model";
import { CombinedDrawer, SectionDrawer } from "./drawers";
import { GoLinks, LossTable, type Go } from "./pieces";
import { SwitchesDrawer, SwitchesTile, marginSwitches, rankSwitches, schemeSwitches } from "./TopSwitches";
import { BridgeTile, HospitalsTile, MarginMonthsTile, PartsTile, SchemeMonthsTile, WhereTile, type DrawerKey } from "./tiles";

// Each panel's place on a desktop's 12 × 3 grid. Listed, and drawn, in the order a smaller
// screen stacks them two or one abreast: each part's loss and the bridge to the margin earned
// first, then the months, where the loss sits, the hospitals, the brands, the scheme's months.
const PLACES = {
  parts: { col: 1, span: 4, row: 1 },
  bridge: { col: 1, span: 4, row: 2 },
  months: { col: 5, span: 8, row: 1 },
  where: { col: 5, span: 4, row: 2 },
  hospitals: { col: 9, span: 4, row: 2, minH: 300 },
  switches: { col: 1, span: 8, row: 3, minH: 300 },
  scheme: { col: 9, span: 4, row: 3 },
} satisfies Record<string, Place>;
const SKELETON: Place[] = Object.values(PLACES);

/** The panels' places while the first answers load. */
export function SummarySkeleton() {
  return <OneScreenGrid ariaLabel="Spend margin missed, loading" loading skeleton={SKELETON}>{null}</OneScreenGrid>;
}

/** The open drawer, kept (with open false) while it slides out so its tab does not change. */
type DrawerState = { key: DrawerKey; tab?: string; open: boolean };

export default function SpendSummary({ meta, filters, plant, onGo }: { meta: Meta; filters: Filters; plant: string; onGo: Go }) {
  // Each section over its own payers: a payer picked in the Cash & TPA section is not carried here.
  const f: Filters = { ...filters, payer: "ALL" };
  const cash = useOverview<CashOverview>({ Plant: plant, ...sectionParams("cash", f) }, "cash");
  const scheme = useOverview<Overview>({ Plant: plant, ...sectionParams("scheme", f) }, "scheme");
  const oof = useOverview<OofOverview>({ Plant: plant, ...sectionParams("oof", f) }, "oof", meta.oof_built !== false);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  if (cash.error || scheme.error) return <Notice title="Couldn't load the spend summary">{cash.error ?? scheme.error}</Notice>;
  if (!cash.data || !scheme.data) return <SummarySkeleton />;

  const c = cash.data, s = scheme.data;
  const cashSec = marginSection(c, "cash", meta);
  const schemeSec = schemeSection(s, meta);
  const oofSec = oof.data ? marginSection(oof.data, "oof", meta, oof.data.headline.coverage) : null;
  const w = c.with_oof ?? null;
  const groups = s.groups ?? null;
  const where = whereOf(c.scope), when = whenOf(meta, c.scope);

  const show = (key: DrawerKey, tab?: string) => setDrawer({ key, tab, open: true });
  const close = () => setDrawer((d) => d && { ...d, open: false });
  const go: Go = (loc) => { close(); onGo(loc); };

  const schemeTop = schemeSwitches(s), cashTop = marginSwitches(c, "cash"), oofTop = oof.data ? marginSwitches(oof.data, "oof") : null;
  const ranked = rankSwitches([schemeTop, cashTop, oofTop ?? []]);
  const oofMissing = oof.error ? `${KIND.oof.short} could not be loaded: ${oof.error}` : oof.loading && !oof.data ? `${KIND.oof.short} is still loading.` : null;

  // HCG's two slices of the scheme margin missed, as a tab of the scheme drawer.
  const healthiumParts: LossRow[] = groups
    ? ([["sutures", "Sutures", groups.healthium.sutures], ["endo", "Endo", groups.healthium.endo]] as const)
        .flatMap(([key, name, b]) => (b ? [{ key, label: b.label ?? name, ...subLoss(b) }] : []))
    : [];
  const slicesTab: DrawerTab[] = groups ? [{
    key: "slices", label: "Attis & Healthium", render: () => (
      <>
        <DrawerSection title="HCG's two slices of the scheme margin missed" note="Parts of the scheme margin missed, not added to it; each label says its share of the scheme margin missed.">
          <LossTable words={KIND.scheme} rows={[
            { key: "attis", label: `${groups.attis.label} (${pct(groups.attis.share_pct, 1)})`, ...spendLoss(groups.attis) },
            { key: "healthium", label: `${groups.healthium.label} (${pct(groups.healthium.share_pct, 1)})`, ...spendLoss(groups.healthium) },
          ]} />
        </DrawerSection>
        {healthiumParts.length > 0 && (
          <DrawerSection title={`${groups.healthium.label}, by group`} note="As HCG's S6 Summary splits the Healthium line.">
            <LossTable words={KIND.scheme} rows={healthiumParts} />
          </DrawerSection>
        )}
        <DrawerSection title="Full tables">
          <GoLinks onGo={go} links={[
            { label: "Scheme overview", section: "scheme", view: "overview" },
            { label: "Scheme brands", section: "scheme", view: "items" },
          ]} />
        </DrawerSection>
      </>
    ),
  }] : [];

  const drawerProps = { meta, filters: f, open: !!drawer?.open, initialTab: drawer?.tab, onClose: close, onGo: go };

  // The drawers render in a portal, so they take no place in the grid; they stay outside the
  // panels, whose bodies are buttons a click inside a drawer must not reach.
  return (
    <OneScreenGrid ariaLabel={`Spend margin missed, ${where}, ${when}`} stale={cash.loading || scheme.loading} skeleton={SKELETON}>
      <PartsTile place={PLACES.parts} cash={cashSec} scheme={schemeSec} w={w} groups={groups} oofReady={oofSec != null} onShow={show} />
      <BridgeTile place={PLACES.bridge} cash={cashSec} w={w} onShow={show} />
      <MarginMonthsTile place={PLACES.months} d={c} meta={meta} cash={cashSec} when={when} onShow={show} />
      <WhereTile place={PLACES.where} cash={cashSec} scheme={schemeSec} onShow={show} />
      <HospitalsTile place={PLACES.hospitals} cash={cashSec} network={c.network ?? null} onShow={show} />
      <SwitchesTile place={PLACES.switches} rows={ranked} context="ranked by rupees lost, never added" missing={oofMissing}
        onOpen={() => show("switches")} onInfo={() => show("switches", "method")} />
      <SchemeMonthsTile place={PLACES.scheme} scheme={schemeSec} when={when} onShow={show} />

      {drawer?.key === "cash" && <SectionDrawer sec={cashSec} {...drawerProps} />}
      {drawer?.key === "oof" && oofSec && <SectionDrawer sec={oofSec} {...drawerProps} />}
      {drawer?.key === "scheme" && <SectionDrawer sec={schemeSec} extraTabs={slicesTab} {...drawerProps} />}
      {drawer?.key === "combined" && w && <CombinedDrawer d={c} w={w} asOf={cashSec.asOf} {...drawerProps} />}
      {drawer?.key === "switches" && (
        <SwitchesDrawer ranked={ranked} scope={c.scope} asOf={cashSec.asOf} {...drawerProps}
          lists={{ scheme: schemeTop, cash: cashTop, ...(oofTop ? { oof: oofTop } : {}) }} />
      )}
    </OneScreenGrid>
  );
}
