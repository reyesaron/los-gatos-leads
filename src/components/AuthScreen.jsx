'use client';
import { useState } from "react";

const RED = "#dc2626";
const RED_DARK = "#450a0a";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";

const iS = { padding: "10px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "#111", color: TEXT, fontSize: 13, outline: "none", width: "100%" };

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleLogin = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      onLogin(data.user);
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setSuccess(data.message);
      if (data.user.status === "approved") {
        // First user (admin) — auto login
        setTimeout(() => {
          setMode("login");
          setSuccess("Account created. Please sign in.");
        }, 1500);
      }
    } catch {
      setError("Connection error. Please try again.");
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/apex-logo-full.jpg" alt="Apex Design Build" style={{ height: 64, borderRadius: 8, marginBottom: 16 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>Construction Leads</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>South Bay Lead Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, padding: "24px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 16, textAlign: "center" }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </div>

          {/* Error / Success messages */}
          {error && (
            <div style={{ background: RED_DARK, border: `1px solid ${RED}44`, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: RED }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: "#052e16", border: "1px solid #4ade8044", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#4ade80" }}>
              {success}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Full Name</label>
                <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Daniel Smith" autoComplete="name" style={iS} />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@apexdesignbuild.com" autoComplete="email" style={iS} />
            </div>

            <div>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Password</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 8 characters with a number" autoComplete={mode === "login" ? "current-password" : "new-password"} style={iS} />
            </div>

            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 11, color: MUTED, fontWeight: 600, display: "block", marginBottom: 4 }}>Confirm Password</label>
                <input type="password" value={form.passwordConfirm} onChange={e => set("passwordConfirm", e.target.value)} placeholder="Enter password again" autoComplete="new-password" style={iS} />
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: "10px 16px", borderRadius: 6, border: "none", background: RED, color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4 }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </div>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: MUTED }}>
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(""); setSuccess(""); setForm({ name: "", email: "", password: "", passwordConfirm: "" }); }} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); setSuccess(""); setForm({ name: "", email: "", password: "", passwordConfirm: "" }); }} style={{ background: "none", border: "none", color: RED, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Sign In
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <img src="/apex-logo.webp" alt="Apex" style={{ height: 18, opacity: 0.3 }} />
        </div>
      </div>
    </div>
  );
}
