"use client";
// Admin-only account approvals page. Reachable only by role="admin" — anyone else is
// bounced back to the dashboard (the backend enforces this independently on every
// /admin/* endpoint via require_admin, this is just so a non-admin never lands on a
// dead page). Lists pending sign-ups with Approve/Reject, plus every account and its
// role/status.
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TbShieldCheck, TbUserCheck, TbUserX, TbUsers, TbClockHour4,
  TbCircleCheck, TbCircleX, TbInbox, TbRefresh, TbMailbox,
} from "react-icons/tb";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, ApiError } from "@/utils/api";
import Badge from "@/components/ui/badge/Badge";

const INK = "#1a1f36", SUB = "#8a91a3", ACCENT = "#3b5bdb", BORDER = "#eef0f4";

type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
};

type Feedback = { kind: "success" | "error"; text: string } | null;

function fullName(u: AdminUser): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.email;
}

function initials(u: AdminUser): string {
  const n = fullName(u).trim();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || u.email[0]?.toUpperCase() || "?";
}

function Spinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <span className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#1b1c22 transparent #1b1c22 #1b1c22" }} />
    </div>
  );
}

export default function AdminApprovalsPage() {
  const { isLoggedIn, isChecking, isAdmin } = useAuth();
  const router = useRouter();

  const [pending, setPending] = useState<AdminUser[] | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Redirect non-admins away — but only once the auth check has actually settled, so
  // a still-loading page doesn't briefly flash a redirect for a legitimate admin.
  useEffect(() => {
    if (isChecking) return;
    if (!isLoggedIn || !isAdmin) router.replace("/");
  }, [isChecking, isLoggedIn, isAdmin, router]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [pendingRes, usersRes] = await Promise.all([
        apiFetch<{ users: AdminUser[] }>("/admin/pending-users"),
        apiFetch<{ users: AdminUser[] }>("/admin/users"),
      ]);
      setPending(pendingRes.users || []);
      setAllUsers(usersRes.users || []);
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load accounts. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (!isChecking && isLoggedIn && isAdmin) load();
  }, [isChecking, isLoggedIn, isAdmin, load]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(t);
  }, [feedback]);

  const act = async (user: AdminUser, action: "approve" | "reject") => {
    setBusyEmail(user.email);
    setFeedback(null);
    try {
      await apiFetch("/admin/approve-user", {
        method: "POST",
        body: JSON.stringify({ email: user.email, action }),
      });
      setFeedback({
        kind: "success",
        text: action === "approve"
          ? `${fullName(user)} has been approved and can now sign in.`
          : `${fullName(user)}'s request has been rejected.`,
      });
      await load();
    } catch (e) {
      setFeedback({ kind: "error", text: e instanceof ApiError ? e.message : "That action didn't go through — please try again." });
    } finally {
      setBusyEmail(null);
    }
  };

  if (isChecking || !isLoggedIn || !isAdmin) return <Spinner />;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 44, height: 44, background: "#eef1fb", color: ACCENT }}>
          <TbShieldCheck size={22} />
        </span>
        <div>
          <h1 className="text-[19px] font-bold tracking-tight" style={{ color: INK }}>Admin — Account Approvals</h1>
          <p className="text-[13px]" style={{ color: SUB }}>Approve or reject new sign-ups, and review everyone with access.</p>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mb-5 flex items-start gap-3 rounded-lg px-4 py-3 text-[13px] shadow-sm ${
            feedback.kind === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"
          }`}
        >
          {feedback.kind === "success" ? <TbCircleCheck size={19} className="flex-shrink-0 mt-0.5" /> : <TbCircleX size={19} className="flex-shrink-0 mt-0.5" />}
          <p className="flex-1 leading-relaxed font-medium">{feedback.text}</p>
        </div>
      )}

      {loadError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-500">
          <span className="font-medium">{loadError}</span>
          <button onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline flex-shrink-0"><TbRefresh size={14} /> Retry</button>
        </div>
      )}

      {/* ── Pending approvals ── */}
      <section className="rounded-2xl bg-white border mb-8" style={{ borderColor: BORDER }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <TbClockHour4 size={17} style={{ color: SUB }} />
            <h2 className="text-[14.5px] font-semibold" style={{ color: INK }}>Pending approvals</h2>
            {pending && pending.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fef3e2", color: "#a05a00" }}>{pending.length}</span>
            )}
          </div>
          <button onClick={load} title="Refresh" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: SUB }}>
            <TbRefresh size={16} />
          </button>
        </div>

        {pending === null ? (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: SUB }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center text-center">
            <TbInbox size={28} style={{ color: "#c7cad4" }} />
            <p className="mt-2.5 text-[13.5px] font-medium" style={{ color: INK }}>No pending accounts</p>
            <p className="mt-1 text-[12.5px] max-w-[320px]" style={{ color: SUB }}>New sign-ups will show up here for you to approve or reject.</p>
          </div>
        ) : (
          <ul>
            {pending.map((u) => (
              <li key={u.email} className="flex items-center gap-3 px-5 py-3.5 border-b last:border-b-0" style={{ borderColor: BORDER }}>
                <span className="flex items-center justify-center rounded-full text-[12px] font-semibold flex-shrink-0" style={{ width: 36, height: 36, background: "#eef1fb", color: ACCENT }}>{initials(u)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold truncate" style={{ color: INK }}>{fullName(u)}</div>
                  <div className="text-[12px] truncate flex items-center gap-1" style={{ color: SUB }}><TbMailbox size={12} /> {u.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => act(u, "reject")}
                    disabled={busyEmail === u.email}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <TbUserX size={14} /> Reject
                  </button>
                  <button
                    onClick={() => act(u, "approve")}
                    disabled={busyEmail === u.email}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "#12b76a" }}
                  >
                    <TbUserCheck size={14} /> {busyEmail === u.email ? "Working…" : "Approve"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── All users ── */}
      <section className="rounded-2xl bg-white border" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <TbUsers size={17} style={{ color: SUB }} />
          <h2 className="text-[14.5px] font-semibold" style={{ color: INK }}>All users</h2>
          {allUsers && <span className="text-[12px]" style={{ color: SUB }}>({allUsers.length})</span>}
        </div>

        {allUsers === null ? (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: SUB }}>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "#f7f8fb" }}>
                  <th className="text-left font-medium px-5 py-2.5 whitespace-nowrap" style={{ color: SUB }}>Name</th>
                  <th className="text-left font-medium px-5 py-2.5 whitespace-nowrap" style={{ color: SUB }}>Email</th>
                  <th className="text-left font-medium px-5 py-2.5 whitespace-nowrap" style={{ color: SUB }}>Role</th>
                  <th className="text-left font-medium px-5 py-2.5 whitespace-nowrap" style={{ color: SUB }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.email} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="px-5 py-3 whitespace-nowrap font-medium" style={{ color: INK }}>{fullName(u)}</td>
                    <td className="px-5 py-3 whitespace-nowrap" style={{ color: "#3c465c" }}>{u.email}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge size="sm" color={u.role === "admin" ? "primary" : "light"}>{u.role === "admin" ? "Admin" : "Member"}</Badge>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge
                        size="sm"
                        color={u.status === "approved" ? "success" : u.status === "pending" ? "warning" : "error"}
                      >
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {allUsers.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center" style={{ color: SUB }}>No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
