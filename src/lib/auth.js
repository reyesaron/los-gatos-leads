import { put, list } from "@vercel/blob";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const BLOB_NAME = "users.json";
const JWT_SECRET = process.env.JWT_SECRET || "apex-leads-secret-change-in-production";
const SESSION_EXPIRY = "24h";

// --- User Storage ---
// In-memory cache to avoid CDN staleness after writes
let _usersCache = null;
let _usersCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function loadUsers() {
  // Return cache if recently written (avoids CDN stale reads)
  if (_usersCache && (Date.now() - _usersCacheTime) < CACHE_TTL) {
    return JSON.parse(JSON.stringify(_usersCache));
  }
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    if (blobs.length === 0) return [];
    const url = blobs[0].url + (blobs[0].url.includes("?") ? "&" : "?") + `_t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    _usersCache = data;
    _usersCacheTime = Date.now();
    return data;
  } catch {
    return [];
  }
}

export async function saveUsers(users) {
  await put(BLOB_NAME, JSON.stringify(users), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  // Update cache immediately so subsequent reads get fresh data
  _usersCache = users;
  _usersCacheTime = Date.now();
}

// --- Password ---

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// --- Validation ---

export function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/\d/.test(password)) return "Password must include a number";
  return null;
}

export function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address";
  return null;
}

// --- Rate Limiting ---

const _loginAttempts = new Map(); // key: email or IP → { count, lockedUntil }
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const _signupAttempts = new Map(); // key: IP → { count, resetAt }
const MAX_SIGNUP_PER_HOUR = 3;

export function checkLoginRateLimit(email, ip) {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = _loginAttempts.get(key);

  if (entry && entry.lockedUntil && now < entry.lockedUntil) {
    const minsLeft = Math.ceil((entry.lockedUntil - now) / 60000);
    return { blocked: true, message: `Account locked. Try again in ${minsLeft} minute${minsLeft !== 1 ? "s" : ""}.`, attemptsLeft: 0 };
  }

  return { blocked: false, attemptsLeft: entry ? MAX_LOGIN_ATTEMPTS - entry.count : MAX_LOGIN_ATTEMPTS };
}

export function recordLoginFailure(email, ip) {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = _loginAttempts.get(key) || { count: 0, lockedUntil: null };

  // Reset if lockout expired
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    entry.count = 0;
    entry.lockedUntil = null;
  }

  entry.count++;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
  }

  _loginAttempts.set(key, entry);
  return { locked: entry.count >= MAX_LOGIN_ATTEMPTS, attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - entry.count) };
}

export function clearLoginAttempts(email) {
  _loginAttempts.delete(email.toLowerCase());
}

export function checkSignupRateLimit(ip) {
  const now = Date.now();
  const entry = _signupAttempts.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_SIGNUP_PER_HOUR) {
      return { blocked: true, message: "Too many signup attempts. Try again later." };
    }
  }

  return { blocked: false };
}

export function recordSignupAttempt(ip) {
  const now = Date.now();
  const entry = _signupAttempts.get(ip) || { count: 0, resetAt: now + 60 * 60 * 1000 };

  if (now >= entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60 * 60 * 1000;
  }

  entry.count++;
  _signupAttempts.set(ip, entry);
}

// --- JWT Sessions ---

export function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: SESSION_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// --- Helpers ---

export function getClientIP(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         request.headers.get("x-real-ip") ||
         "unknown";
}

export function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// --- Login Audit Log ---
// Stored in-memory, flushed to Blob periodically
let _loginLog = [];

export function logLoginEvent(type, email, ip, details) {
  _loginLog.push({
    type, // "login_success", "login_failure", "lockout"
    email: email || "",
    ip: ip || "unknown",
    details: details || "",
    timestamp: new Date().toISOString(),
  });
  // Flush to Blob every 10 entries
  if (_loginLog.length >= 10) flushLoginLog();
}

async function flushLoginLog() {
  if (_loginLog.length === 0) return;
  const entries = [..._loginLog];
  _loginLog = [];
  try {
    // Load existing log
    let existing = [];
    const { blobs } = await list({ prefix: "login-log.json" });
    if (blobs.length > 0) {
      const url = blobs[0].url + "?_t=" + Date.now();
      const res = await fetch(url, { cache: "no-store" });
      existing = await res.json();
    }
    // Append and keep last 1000 entries
    const combined = [...entries, ...existing].slice(0, 1000);
    await put("login-log.json", JSON.stringify(combined), {
      access: "public", addRandomSuffix: false, allowOverwrite: true,
    });
  } catch { /* best effort */ }
}

export async function getLoginLog() {
  // Merge in-memory with persisted
  try {
    const { blobs } = await list({ prefix: "login-log.json" });
    let persisted = [];
    if (blobs.length > 0) {
      const url = blobs[0].url + "?_t=" + Date.now();
      const res = await fetch(url, { cache: "no-store" });
      persisted = await res.json();
    }
    return [..._loginLog, ...persisted];
  } catch {
    return [..._loginLog];
  }
}

// Force flush on module unload (best effort)
export { flushLoginLog };
