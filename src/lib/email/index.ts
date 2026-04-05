import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "FitBook <noreply@fitbook.app>";

function emailWrapper(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0f172a;padding:20px 24px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">FitBook</h1>
    </div>
    <div style="padding:24px;">
      ${content}
    </div>
    <div style="padding:16px 24px;background:#f4f4f5;text-align:center;">
      <p style="margin:0;color:#71717a;font-size:12px;">Sent by FitBook — Free booking for personal trainers</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendBookingConfirmation({
  to,
  trainerName,
  date,
  time,
  slug,
}: {
  to: string;
  trainerName: string;
  date: string;
  time: string;
  slug: string;
}) {
  const html = emailWrapper(`
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:48px;height:48px;line-height:48px;text-align:center;">
        <span style="font-size:24px;">&#10003;</span>
      </div>
    </div>
    <h2 style="margin:0 0 8px;font-size:20px;text-align:center;">Booking Confirmed</h2>
    <p style="color:#71717a;text-align:center;margin:0 0 20px;">Your session has been booked successfully.</p>
    <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Trainer</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${trainerName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Date</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${date}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Time</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${time}</td>
        </tr>
      </table>
    </div>
    <p style="color:#71717a;font-size:13px;text-align:center;">We'll send you a reminder 24 hours before your session.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Booking Confirmed with ${trainerName}`,
    html,
  });
}

export async function sendBookingReminder({
  to,
  trainerName,
  date,
  time,
}: {
  to: string;
  trainerName: string;
  date: string;
  time: string;
}) {
  const html = emailWrapper(`
    <div style="text-align:center;margin-bottom:20px;">
      <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:48px;height:48px;line-height:48px;text-align:center;">
        <span style="font-size:24px;">&#128276;</span>
      </div>
    </div>
    <h2 style="margin:0 0 8px;font-size:20px;text-align:center;">Session Tomorrow</h2>
    <p style="color:#71717a;text-align:center;margin:0 0 20px;">This is a friendly reminder about your upcoming session.</p>
    <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Trainer</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${trainerName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Date</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${date}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Time</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${time}</td>
        </tr>
      </table>
    </div>
    <p style="color:#71717a;font-size:13px;text-align:center;">See you there!</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: Session with ${trainerName} tomorrow`,
    html,
  });
}

export async function sendCancellationNotice({
  to,
  trainerName,
  date,
  time,
}: {
  to: string;
  trainerName: string;
  date: string;
  time: string;
}) {
  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;text-align:center;">Session Cancelled</h2>
    <p style="color:#71717a;text-align:center;margin:0 0 20px;">Your session has been cancelled.</p>
    <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Trainer</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${trainerName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Date</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${date}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#71717a;font-size:14px;">Time</td>
          <td style="padding:4px 0;text-align:right;font-size:14px;font-weight:600;">${time}</td>
        </tr>
      </table>
    </div>
    <p style="color:#71717a;font-size:13px;text-align:center;">If you'd like to rebook, visit your trainer's booking page.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Session Cancelled with ${trainerName}`,
    html,
  });
}
