import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const REDIRECT_URI = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/auth/google/callback`
  : "https://los-gatos-leads.vercel.app/api/auth/google/callback";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

// --- OAuth Flow ---

export function getAuthUrl(userId) {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId, // Pass user ID to callback
  });
}

export async function getTokensFromCode(code) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

// --- Calendar Operations ---

function getAuthenticatedClient(tokens) {
  const client = getOAuth2Client();
  client.setCredentials(tokens);
  return client;
}

export async function createCalendarEvent(tokens, { address, scope, notes, followUpDate, crmUrl }) {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: `Follow-up: ${address}`,
    description: `${scope}\n\n${notes || ""}\n\nView in CRM: ${crmUrl || "https://los-gatos-leads.vercel.app"}`.trim(),
    start: {
      date: followUpDate, // YYYY-MM-DD (all-day event)
    },
    end: {
      date: followUpDate,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "popup", minutes: 480 }, // 8 hours before (morning of)
      ],
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data; // includes id for updates/deletes
}

export async function updateCalendarEvent(tokens, eventId, { address, scope, notes, followUpDate, crmUrl }) {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: `Follow-up: ${address}`,
    description: `${scope}\n\n${notes || ""}\n\nView in CRM: ${crmUrl || "https://los-gatos-leads.vercel.app"}`.trim(),
    start: { date: followUpDate },
    end: { date: followUpDate },
  };

  const res = await calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: event,
  });

  return res.data;
}

export async function deleteCalendarEvent(tokens, eventId) {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
}

export async function refreshTokensIfNeeded(tokens) {
  if (!tokens.expiry_date || tokens.expiry_date > Date.now() + 5 * 60 * 1000) {
    return tokens; // Still valid
  }
  // Refresh
  const client = getAuthenticatedClient(tokens);
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}
