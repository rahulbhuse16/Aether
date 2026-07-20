"use strict";
// utils/sendWelcomeMail.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeMail = sendWelcomeMail;
exports.sendResetPasswordMail = sendResetPasswordMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.ENV.SMTP_HOST,
    port: Number(env_1.ENV.SMTP_PORT),
    secure: Number(env_1.ENV.SMTP_PORT) === 465,
    auth: {
        user: env_1.ENV.SMTP_USER,
        pass: env_1.ENV.SMTP_PASS,
    },
});
const LOGO_URL = process.env.LOGO_URL ||
    `${env_1.ENV.FRONTEND_URL}/aether_logo.png`;
async function sendWelcomeMail(email) {
    try {
        await transporter.sendMail({
            from: `"Aether.ai" <${env_1.ENV.SMTP_FROM}>`,
            to: email,
            subject: "Welcome to Aether",
            html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>Welcome to Aether</title>
</head>

<body style="margin:0;padding:0;background:#F4F7FC;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F4F7FC">
<tr>
<td align="center" style="padding:50px 20px;">

<table width="640" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:22px;overflow:hidden;
box-shadow:0 10px 35px rgba(15,23,42,.08);">

<!-- HERO -->

<tr>
<td
align="center"
style="
padding:55px;
background:linear-gradient(135deg,#2563EB 0%,#4F46E5 55%,#06B6D4 100%);
">

<img
src="${LOGO_URL}"
width="110"
alt="Aether"
style="display:block;margin-bottom:24px;">

<div style="
color:white;
font-size:38px;
font-weight:700;
line-height:48px;
">
Welcome to Aether
</div>

<div style="
margin-top:18px;
color:#E8EEFF;
font-size:18px;
line-height:30px;
max-width:470px;
">
The AI workspace that helps developers build,
review, debug and ship software faster.
</div>

</td>
</tr>

<!-- BODY -->

<tr>

<td style="padding:50px;">

<div style="
font-size:28px;
font-weight:700;
color:#111827;
margin-bottom:20px;
">
Your workspace is ready 🎉
</div>

<div style="
font-size:17px;
line-height:32px;
color:#475569;
">

Thanks for joining Aether.

You now have access to a modern AI-powered software engineering platform
designed to increase productivity and reduce development time.

Start exploring your workspace, connect your repositories,
and let AI accelerate your development workflow.

</div>

<!-- FEATURES -->

<table
width="100%"
cellpadding="18"
cellspacing="0"
style="margin-top:40px;">

<tr>

<td style="
border:1px solid #E5E7EB;
border-radius:12px;
padding:18px;
">

<div style="font-size:18px;font-weight:600;color:#111827;">
🤖 AI Coding Assistant
</div>

<div style="margin-top:8px;color:#64748B;font-size:15px;line-height:26px;">
Generate production-ready code instantly.
</div>

</td>

</tr>

<tr>

<td style="
border:1px solid #E5E7EB;
border-radius:12px;
padding:18px;
">

<div style="font-size:18px;font-weight:600;color:#111827;">
🐞 AI Bug Detection
</div>

<div style="margin-top:8px;color:#64748B;font-size:15px;line-height:26px;">
Find issues before deployment.
</div>

</td>

</tr>

<tr>

<td style="
border:1px solid #E5E7EB;
border-radius:12px;
padding:18px;
">

<div style="font-size:18px;font-weight:600;color:#111827;">
🏗 Architecture Generator
</div>

<div style="margin-top:8px;color:#64748B;font-size:15px;line-height:26px;">
Generate scalable project architecture using AI.
</div>

</td>

</tr>

<tr>

<td style="
border:1px solid #E5E7EB;
border-radius:12px;
padding:18px;
">

<div style="font-size:18px;font-weight:600;color:#111827;">
📂 GitHub Integration
</div>

<div style="margin-top:8px;color:#64748B;font-size:15px;line-height:26px;">
Connect repositories and analyze projects instantly.
</div>

</td>

</tr>

<tr>

<td style="
border:1px solid #E5E7EB;
border-radius:12px;
padding:18px;
">

<div style="font-size:18px;font-weight:600;color:#111827;">
💬 AI Project Chat
</div>

<div style="margin-top:8px;color:#64748B;font-size:15px;line-height:26px;">
Ask questions about your codebase in natural language.
</div>

</td>

</tr>

</table>

<!-- BUTTON -->

<div style="text-align:center;margin:50px 0 20px;">

<a
href="${env_1.ENV.FRONTEND_URL}"
style="
display:inline-block;
padding:16px 40px;
background:#2563EB;
color:white;
font-size:17px;
font-weight:bold;
text-decoration:none;
border-radius:10px;
">

Open Aether →

</a>

</div>

<div style="
font-size:15px;
line-height:28px;
color:#64748B;
text-align:center;
">

Need help getting started?

Our AI assistants are available throughout your workspace to help you write code, review repositories, generate architecture, detect bugs, and answer technical questions.

</div>

</td>

</tr>

<!-- FOOTER -->

<tr>

<td
style="
padding:35px;
background:#F8FAFC;
text-align:center;
border-top:1px solid #E2E8F0;
">

<img
src="${LOGO_URL}"
width="42"
style="margin-bottom:15px;">

<div
style="
font-size:20px;
font-weight:700;
color:#111827;
">

Aether

</div>

<div
style="
margin-top:8px;
color:#64748B;
font-size:15px;
">

Build Smarter • Ship Faster • Powered by AI

</div>

<div
style="
margin-top:25px;
color:#94A3B8;
font-size:13px;
">

© ${new Date().getFullYear()} Aether.ai

</div>

</td>

</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
        });
        return true;
    }
    catch (error) {
        console.error("Welcome email:", error);
        return false;
    }
}
const LOGO_URL_RESET = `${env_1.ENV.FRONTEND_URL}/aether_logo.png`;
async function sendResetPasswordMail(email, resetUrl, name) {
    try {
        await transporter.sendMail({
            from: `"Aether.ai" <${env_1.ENV.SMTP_FROM}>`,
            to: email,
            subject: "Reset your Aether password",
            html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>Reset your password</title>
</head>

<body style="margin:0;padding:0;background:#F4F7FC;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#F4F7FC">
<tr>
<td align="center" style="padding:50px 20px;">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:22px;overflow:hidden;
box-shadow:0 10px 35px rgba(15,23,42,.08);">

<!-- HERO -->
<tr>
<td
align="center"
style="
padding:45px;
background:linear-gradient(135deg,#2563EB 0%,#4F46E5 55%,#06B6D4 100%);
">

<img
src="${LOGO_URL_RESET}"
width="90"
alt="Aether"
style="display:block;margin-bottom:20px;">

<div style="
color:white;
font-size:30px;
font-weight:700;
line-height:40px;
">
Reset your password
</div>

</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:50px;">

<div style="
font-size:17px;
line-height:30px;
color:#475569;
">

Hi${name ? ` ${name}` : ""},<br><br>

We received a request to reset the password for your Aether account
(<strong>${email}</strong>). Click the button below to choose a new password.

</div>

<div style="text-align:center;margin:40px 0 20px;">
<a

href="${resetUrl}"
style="
display:inline-block;
padding:16px 40px;
background:#2563EB;
color:white;
font-size:17px;
font-weight:bold;
text-decoration:none;
border-radius:10px;
">
Reset Password
</a>
</div>

<div style="
font-size:14px;
line-height:24px;
color:#94A3B8;
text-align:center;
margin-top:10px;
">
This link expires in 1 hour. If you didn't request a password reset,
you can safely ignore this email — your password will not be changed.
</div>



</td>
</tr>

<!-- FOOTER -->
<tr>
<td
style="
padding:35px;
background:#F8FAFC;
text-align:center;
border-top:1px solid #E2E8F0;
">

<img
src="${LOGO_URL_RESET}"
width="36"
style="margin-bottom:12px;">

<div style="font-size:18px;font-weight:700;color:#111827;">
Aether
</div>

<div style="margin-top:8px;color:#64748B;font-size:14px;">
Build Smarter • Ship Faster • Powered by AI
</div>

<div style="margin-top:20px;color:#94A3B8;font-size:12px;">
© ${new Date().getFullYear()} Aether.ai
</div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
        });
        return true;
    }
    catch (error) {
        console.error("Reset password email:", error);
        return false;
    }
}
