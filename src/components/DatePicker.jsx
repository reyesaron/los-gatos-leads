'use client';
import { useState, useRef, useEffect } from "react";

const RED = "#dc2626";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#262626";
const TEXT = "#e5e5e5";
const MUTED = "#737373";
const DIM = "#404040";

const QUICK_OPTIONS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "1 Week", days: 7 },
  { label: "2 Weeks", days: 14 },
  { label: "1 Month", days: 30 },
];

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function MiniCalendar({ selectedDate, onSelect, onClose }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(selectedDate ? parseInt(selectedDate.split("-")[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate ? parseInt(selectedDate.split("-")[1]) - 1 : today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = today.toISOString().split("T")[0];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, width: 240, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
      {/* Month/Year nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>◀</button>
        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{monthNames[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>▶</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, color: DIM, fontWeight: 600, padding: 2 }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <button
              key={day}
              onClick={() => { onSelect(dateStr); onClose(); }}
              disabled={isPast}
              style={{
                width: 30, height: 30, borderRadius: 15,
                border: isToday ? `1px solid ${RED}` : "1px solid transparent",
                background: isSelected ? RED : "transparent",
                color: isPast ? DIM : isSelected ? "#fff" : TEXT,
                fontSize: 11, fontWeight: isSelected || isToday ? 700 : 400,
                cursor: isPast ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (!isPast && !isSelected) e.target.style.background = "#1c1c1c"; }}
              onMouseLeave={e => { if (!isPast && !isSelected) e.target.style.background = "transparent"; }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {selectedDate && (
        <button onClick={() => { onSelect(""); onClose(); }} style={{ marginTop: 6, width: "100%", padding: "4px 0", borderRadius: 4, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 10, cursor: "pointer" }}>
          Clear Date
        </button>
      )}
    </div>
  );
}

export default function DatePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const ref = useRef(null);

  const [openUp, setOpenUp] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Detect if dropdown should open upward
  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 300);
    }
  }, [open]);

  const handleQuickSelect = (days) => {
    onChange(addDays(days));
    setOpen(false);
    setShowCalendar(false);
  };

  const handleCalendarSelect = (date) => {
    onChange(date);
    setShowCalendar(false);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Display button */}
      <button
        onClick={() => { setOpen(!open); setShowCalendar(false); }}
        style={{
          padding: "4px 10px", borderRadius: 5,
          border: `1px solid ${value ? RED + "44" : BORDER}`,
          background: value ? "#1a0a0a" : "#111",
          color: value ? TEXT : MUTED,
          fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          minWidth: 100,
        }}
      >
        <span style={{ fontSize: 12 }}>📅</span>
        {value ? formatDisplay(value) : (placeholder || "Set date")}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: "absolute", [openUp ? "bottom" : "top"]: "100%", left: 0, [openUp ? "marginBottom" : "marginTop"]: 4, zIndex: 200 }}>
          {!showCalendar ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 6, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              {QUICK_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleQuickSelect(opt.days)}
                  style={{
                    display: "block", width: "100%", padding: "6px 10px",
                    border: "none", borderRadius: 4,
                    background: "transparent", color: TEXT,
                    fontSize: 12, textAlign: "left", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.target.style.background = "#1c1c1c"}
                  onMouseLeave={e => e.target.style.background = "transparent"}
                >
                  {opt.label}
                  <span style={{ float: "right", color: DIM, fontSize: 10 }}>
                    {formatDisplay(addDays(opt.days))}
                  </span>
                </button>
              ))}
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 4 }}>
                <button
                  onClick={() => setShowCalendar(true)}
                  style={{
                    display: "block", width: "100%", padding: "6px 10px",
                    border: "none", borderRadius: 4,
                    background: "transparent", color: RED,
                    fontSize: 12, textAlign: "left", cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onMouseEnter={e => e.target.style.background = "#1c1c1c"}
                  onMouseLeave={e => e.target.style.background = "transparent"}
                >
                  Pick a date...
                </button>
              </div>
              {value && (
                <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 4 }}>
                  <button
                    onClick={() => { onChange(""); setOpen(false); }}
                    style={{
                      display: "block", width: "100%", padding: "6px 10px",
                      border: "none", borderRadius: 4,
                      background: "transparent", color: DIM,
                      fontSize: 11, textAlign: "left", cursor: "pointer",
                    }}
                    onMouseEnter={e => e.target.style.background = "#1c1c1c"}
                    onMouseLeave={e => e.target.style.background = "transparent"}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          ) : (
            <MiniCalendar
              selectedDate={value}
              onSelect={handleCalendarSelect}
              onClose={() => { setShowCalendar(false); setOpen(false); }}
            />
          )}
        </div>
      )}
    </div>
  );
}
