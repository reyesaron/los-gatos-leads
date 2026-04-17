import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const REDIRECT_URI = "https://los-gatos-leads.vercel.app/api/auth/google/callback";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

// --- OAuth Flow ---

export function getAuthUrl(userId) {
  // Build URL manually — googleapis library was generating empty client_id on Vercel
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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

export async function createCalendarEvent(tokens, { title, description, followUpDate }) {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  // 8am event in Pacific time
  const event = {
    summary: title,
    description: description || "",
    start: {
      dateTime: `${followUpDate}T08:00:00`,
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: `${followUpDate}T08:30:00`,
      timeZone: "America/Los_Angeles",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 0 },   // At event time
        { method: "popup", minutes: 30 },   // 30 min before (7:30am)
      ],
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data;
}

export async function updateCalendarEvent(tokens, eventId, { title, description, followUpDate }) {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: title,
    description: description || "",
    start: {
      dateTime: `${followUpDate}T08:00:00`,
      timeZone: "America/Los_Angeles",
    },
    end: {
      dateTime: `${followUpDate}T08:30:00`,
      timeZone: "America/Los_Angeles",
    },
  };

  const res = await calendar.events.update({
    calendarId: "primary",
    eventId,
    requestBody: event,
  });

  return res.data;
}

export async function deleteCalendarEvent(tokens, eventId) {
  try {
    const auth = getAuthenticatedClient(tokens);
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId });
  } catch (err) {
    // Event may already be deleted
    if (err.code !== 404 && err.code !== 410) throw err;
  }
}

export async function refreshTokensIfNeeded(tokens) {
  if (!tokens.expiry_date || tokens.expiry_date > Date.now() + 5 * 60 * 1000) {
    return tokens;
  }
  const client = getAuthenticatedClient(tokens);
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

// --- Helper: create event for multiple users ---

export async function createEventForUsers(users, { title, description, followUpDate, eventKeyPrefix }) {
  const results = {};
  for (const user of users) {
    if (!user?.googleCalendarConnected || !user?.googleTokens) continue;
    try {
      const tokens = await refreshTokensIfNeeded(user.googleTokens);
      const event = await createCalendarEvent(tokens, { title, description, followUpDate });
      results[user.id] = event.id;
    } catch (err) {
      console.error(`Calendar event failed for ${user.name}:`, err.message);
    }
  }
  return results; // { userId: eventId, ... }
}

export async function updateEventForUsers(users, eventIds, { title, description, followUpDate }) {
  for (const user of users) {
    if (!user?.googleTokens || !eventIds?.[user.id]) continue;
    try {
      const tokens = await refreshTokensIfNeeded(user.googleTokens);
      await updateCalendarEvent(tokens, eventIds[user.id], { title, description, followUpDate });
    } catch (err) {
      console.error(`Calendar update failed for ${user.name}:`, err.message);
    }
  }
}

export async function deleteEventForUsers(users, eventIds) {
  for (const user of users) {
    if (!user?.googleTokens || !eventIds?.[user.id]) continue;
    try {
      const tokens = await refreshTokensIfNeeded(user.googleTokens);
      await deleteCalendarEvent(tokens, eventIds[user.id]);
    } catch (err) {
      console.error(`Calendar delete failed for ${user.name}:`, err.message);
    }
  }
}
