import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendRatingRequest({
  to,
  trainerName,
  ratingToken,
  appUrl,
}: {
  to: string;
  trainerName: string;
  ratingToken: string;
  appUrl: string;
}) {
  const rateUrl = `${appUrl}/rate/${ratingToken}`;

  return resend.emails.send({
    from: "FitBook <noreply@fitbook.app>",
    to,
    subject: `How was your session with ${trainerName}?`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0f172a;padding:20px 24px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">FitBook</h1>
    </div>
    <div style="padding:24px;text-align:center;">
      <h2 style="margin:0 0 8px;font-size:20px;">How was your session?</h2>
      <p style="color:#71717a;margin:0 0 24px;">Tap a star to rate your session with <strong>${trainerName}</strong></p>
      <a href="${rateUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
        Rate Your Session &#9733;
      </a>
      <p style="color:#a1a1aa;font-size:12px;margin-top:16px;">It takes less than 10 seconds</p>
    </div>
    <div style="padding:16px 24px;background:#f4f4f5;text-align:center;">
      <p style="margin:0;color:#71717a;font-size:12px;">Sent by FitBook</p>
    </div>
  </div>
</body>
</html>`,
  });
}
