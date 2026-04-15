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
