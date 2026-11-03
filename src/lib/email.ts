import { EMAIL_FROM, RESEND_API_KEY } from "astro:env/server";

export const emailConfigured = Boolean(RESEND_API_KEY && EMAIL_FROM);

interface Email {
    to: string;
    subject: string;
    text: string;
    html: string;
}

// https://resend.com/docs/api-reference/emails/send-email
export async function sendEmail(email: Email) {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: EMAIL_FROM, ...email, to: [email.to] }),
    });
    if (!response.ok) {
        throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
    }
}

const escapeHtml = (text: string) =>
    text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function magicLinkEmail(to: string, url: string): Email {
    return {
        to,
        subject: "Your Live Coders Naarm login link",
        text: [
            "Here's your link to log in to Live Coders Naarm:",
            "",
            url,
            "",
            "It works once and expires in 5 minutes.",
            "If you didn't ask for it, you can ignore this email.",
        ].join("\n"),
        html: `<p>Here's your link to log in to Live Coders Naarm:</p>
<p><a href="${escapeHtml(url)}">Log in</a></p>
<p>It works once and expires in 5 minutes.<br>If you didn't ask for it, you can ignore this email.</p>`,
    };
}
