import { neon } from "@neondatabase/serverless";

function getSQL() {
  return neon(process.env.DATABASE_URL);
}

// --- Schema Setup (runs once) ---

let _initialized = false;

async function ensureTable() {
  if (_initialized) return;
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action VARCHAR(50) NOT NULL,
      user_name VARCHAR(100),
      user_email VARCHAR(200),
      user_role VARCHAR(20),
      ip VARCHAR(50),
      target_type VARCHAR(50),
      target_id VARCHAR(200),
      details TEXT,
      user_agent TEXT
    )
  `;
  // Index for common queries
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log (timestamp DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_email)`;
  _initialized = true;
}

// --- Log an Event ---

export async function logAudit({
  action,       // e.g. "login_success", "lead_status_change", "contact_add"
  userName,     // who did it
  userEmail,
  userRole,
  ip,           // client IP
  targetType,   // e.g. "lead", "architect", "user"
  targetId,     // e.g. lead ID, contact name
  details,      // free text with context
  userAgent,    // browser user agent
}) {
  try {
    await ensureTable();
    const sql = getSQL();
    await sql`
      INSERT INTO audit_log (action, user_name, user_email, user_role, ip, target_type, target_id, details, user_agent)
      VALUES (${action}, ${userName || null}, ${userEmail || null}, ${userRole || null}, ${ip || null}, ${targetType || null}, ${targetId || null}, ${details || null}, ${userAgent || null})
    `;
  } catch (err) {
    // Best effort — don't break the app if logging fails
    console.error("Audit log error:", err.message);
  }
}

// --- Query Events (admin only) ---

export async function queryAuditLog({ limit = 100, offset = 0, action, userEmail, startDate, endDate, search } = {}) {
  try {
    await ensureTable();
    const sql = getSQL();

    // Build dynamic query with filters
    let conditions = [];
    let params = [];

    if (action) conditions.push(`action = '${action}'`);
    if (userEmail) conditions.push(`user_email = '${userEmail}'`);
    if (startDate) conditions.push(`timestamp >= '${startDate}'`);
    if (endDate) conditions.push(`timestamp <= '${endDate}'`);
    if (search) conditions.push(`(details ILIKE '%${search}%' OR target_id ILIKE '%${search}%' OR user_name ILIKE '%${search}%')`);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await sql`SELECT COUNT(*) as total FROM audit_log ${sql.unsafe(where)}`;
    const rows = await sql`SELECT * FROM audit_log ${sql.unsafe(where)} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;

    return {
      entries: rows,
      total: parseInt(countResult[0]?.total || 0),
      limit,
      offset,
    };
  } catch (err) {
    console.error("Audit query error:", err.message);
    return { entries: [], total: 0, limit, offset };
  }
}

// --- Get distinct values for filters ---

export async function getAuditFilterOptions() {
  try {
    await ensureTable();
    const sql = getSQL();
    const actions = await sql`SELECT DISTINCT action FROM audit_log ORDER BY action`;
    const users = await sql`SELECT DISTINCT user_email FROM audit_log WHERE user_email IS NOT NULL ORDER BY user_email`;
    return {
      actions: actions.map(r => r.action),
      users: users.map(r => r.user_email),
    };
  } catch {
    return { actions: [], users: [] };
  }
}
