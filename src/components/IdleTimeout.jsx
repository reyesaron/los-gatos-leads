'use client';
import { useState, useEffect, useCallback, useRef } from "react";

const RED = "#dc2626";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_DURATION = 30 * 1000;   // 30 second countdown

export default function IdleTimeout({ onLogout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const idleTimer = useRef(null);
  const warningTimer = useRef(null);
  const countdownInterval = useRef(null);

  const resetIdleTimer = useCallback(() => {
    // If warning is showing and user interacts, dismiss it
    if (showWarning) {
      setShowWarning(false);
      setCountdown(30);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    }

    // Reset the idle timer
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Show warning
      setShowWarning(true);
      setCountdown(30);

      // Start countdown
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-logout after warning duration
      warningTimer.current = setTimeout(() => {
        handleLogout();
      }, WARNING_DURATION);
    }, IDLE_TIMEOUT);
  }, [showWarning]);

  const handleLogout = useCallback(async () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    await fetch("/api/auth/me", { method: "DELETE" });
    onLogout();
  }, [onLogout]);

  const stayLoggedIn = useCallback(() => {
    setShowWarning(false);
    setCountdown(30);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      if (!showWarning) resetIdleTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdleTimer(); // Start the timer

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [resetIdleTimer, showWarning]);

  if (!showWarning) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "28px 32px", maxWidth: 380, width: "90%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Session Expiring</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.5 }}>
          You've been idle for 15 minutes. You'll be logged out in:
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: countdown <= 10 ? RED : TEXT, fontFamily: "'JetBrains Mono',monospace", marginBottom: 20 }}>
          {countdown}s
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={stayLoggedIn} style={{ padding: "10px 24px", borderRadius: 6, border: "none", background: RED, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Stay Logged In
          </button>
          <button onClick={handleLogout} style={{ padding: "10px 24px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 13, cursor: "pointer" }}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
