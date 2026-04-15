'use client';
import { useState } from "react";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const iS = { padding: "8px 10px", borderRadius: 5, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 12, outline: "none", width: "100%" };

export default function ProfileMenu({ user, onLogout, onAdminClick, onAuditClick }) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = (user.name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const handlePasswordChange = async () => {
    setPassError(""); setPassSuccess(""); setSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passForm),
      });
      const data = await res.json();
      if (!res.ok) { setPassError(data.error); setSaving(false); return; }
      setPassSuccess(data.message);
      setPassForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      setTimeout(() => { setShowPassword(false); setPassSuccess(""); }, 2000);
    } catch {
      setPassError("Connection error");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    onLogout();
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Avatar button */}
      <button onClick={() => setOpen(!open)} style={{ width: 32, height: 32, borderRadius: 16, background: RED_DARK, color: RED, border: `1.5px solid ${RED}44`, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 280, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {/* User info */}
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{user.name}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{user.email}</div>
            <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{user.role === "admin" ? "Admin" : "Team Member"}</div>
          </div>

          {/* Password change */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => { setShowPassword(!showPassword); setPassError(""); setPassSuccess(""); }} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0 }}>
              {showPassword ? "Cancel" : "Change Password"}
            </button>
            {showPassword && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {passError && <div style={{ fontSize: 11, color: RED }}>{passError}</div>}
                {passSuccess && <div style={{ fontSize: 11, color: "#4ade80" }}>{passSuccess}</div>}
                <input type="password" placeholder="Current password" value={passForm.currentPassword} onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} style={iS} />
                <input type="password" placeholder="New password" value={passForm.newPassword} onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} style={iS} />
                <input type="password" placeholder="Confirm new password" value={passForm.newPasswordConfirm} onChange={e => setPassForm(f => ({ ...f, newPasswordConfirm: e.target.value }))} style={iS} />
                <button onClick={handlePasswordChange} disabled={saving || !passForm.currentPassword || !passForm.newPassword || !passForm.newPasswordConfirm} style={{ padding: "6px 12px", borderRadius: 5, border: "none", background: RED, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            )}
          </div>

          {/* Google Calendar */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
            {user.googleCalendarConnected ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#4ade80" }}>Google Calendar connected</span>
                <button onClick={async () => { await fetch("/api/auth/google", { method: "DELETE" }); window.location.reload(); }} style={{ background: "none", border: "none", color: DIM, fontSize: 11, cursor: "pointer" }}>Disconnect</button>
              </div>
            ) : (
              <button onClick={async () => { const res = await fetch("/api/auth/google"); const data = await res.json(); if (data.url) window.location.href = data.url; }} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0 }}>
                Connect Google Calendar
              </button>
            )}
          </div>

          {/* Admin */}
          {user.role === "admin" && (
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 16 }}>
              <button onClick={() => { onAdminClick(); setOpen(false); }} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0 }}>
                Manage Users
              </button>
              <button onClick={() => { onAuditClick(); setOpen(false); }} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0 }}>
                Audit Log
              </button>
            </div>
          )}

          {/* Logout */}
          <div style={{ padding: "10px 14px" }}>
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: RED, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
