import { Request, Response } from "express";
import nodemailer from "nodemailer";
import { ENV } from "../config/env";

export const sendTestEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { to, name = "Rahul" } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        message: "Recipient email is required.",
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: Number(ENV.SMTP_PORT),
      secure: Number(ENV.SMTP_PORT) === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Aether Email</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;background:#f4f6f9;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

<tr>
<td style="background:#2563eb;padding:28px;text-align:center;">
<h1 style="margin:0;color:#ffffff;">
🚀 Aether
</h1>
<p style="margin-top:8px;color:#dbeafe;">
AI Powered Development Platform
</p>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#111827;">
Hello ${name},
</h2>

<p style="font-size:16px;line-height:1.7;color:#374151;">
This is a successful test email sent from your
<strong>Aether Backend</strong>.
</p>

<div style="margin:30px 0;padding:20px;background:#f9fafb;border-left:5px solid #2563eb;border-radius:8px;">
<p style="margin:0;font-size:15px;color:#374151;">
✅ SMTP configuration is working correctly.
</p>
</div>

<table width="100%" style="margin-top:25px;">
<tr>
<td style="padding:12px;border-bottom:1px solid #eee;">
<b>Environment</b>
</td>
<td style="padding:12px;border-bottom:1px solid #eee;">
${process.env.NODE_ENV || "development"}
</td>
</tr>

<tr>
<td style="padding:12px;border-bottom:1px solid #eee;">
<b>SMTP Host</b>
</td>
<td style="padding:12px;border-bottom:1px solid #eee;">
${ENV.SMTP_HOST}
</td>
</tr>

<tr>
<td style="padding:12px;">
<b>Time</b>
</td>
<td style="padding:12px;">
${new Date().toLocaleString()}
</td>
</tr>
</table>

<div style="text-align:center;margin-top:40px;">
<a
href="${ENV.FRONTEND_URL}"
style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;">
Open Aether
</a>
</div>

</td>
</tr>

<tr>
<td style="background:#111827;padding:20px;text-align:center;color:#9ca3af;font-size:13px;">
© ${new Date().getFullYear()} Aether • Built with ❤️ using Node.js & Nodemailer
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
`;

    const info = await transporter.sendMail({
      from: `"Aether" <${ENV.SMTP_FROM}>`,
      to,
      subject: "🚀 Aether SMTP Test Email",
      html,
    });

    res.status(200).json({
      success: true,
      message: "Email sent successfully.",
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error: any) {
    console.error("SMTP Error:", error);

    
  }
};