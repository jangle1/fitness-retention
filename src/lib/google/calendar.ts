import { google } from "googleapis";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  );
}

export function getCalendarClient(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Get the Google OAuth URL with Calendar scope
 */
export function getGoogleAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  });
}

/**
 * Perform an incremental sync using the stored syncToken.
 * Falls back to a full sync if the token is invalid.
 */
export async function incrementalSync(
  refreshToken: string,
  calendarId: string,
  syncToken: string | null
) {
  const calendar = getCalendarClient(refreshToken);

  try {
    const params: Record<string, unknown> = {
      calendarId,
      singleEvents: true,
    };

    if (syncToken) {
      params.syncToken = syncToken;
    } else {
      // Full sync: get events from the last 30 days onward
      params.timeMin = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    const response = await calendar.events.list(params);

    return {
      events: response.data.items || [],
      nextSyncToken: response.data.nextSyncToken || null,
    };
  } catch (error: unknown) {
    // If sync token is invalid (410 Gone), do a full sync
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 410
    ) {
      return incrementalSync(refreshToken, calendarId, null);
    }
    throw error;
  }
}

/**
 * Register a webhook to receive push notifications for calendar changes
 */
export async function registerWebhook(
  refreshToken: string,
  calendarId: string,
  channelId: string
) {
  const calendar = getCalendarClient(refreshToken);

  const response = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`,
    },
  });

  return {
    resourceId: response.data.resourceId,
    expiration: response.data.expiration,
  };
}
