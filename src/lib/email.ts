import { EMAIL_FROM, RESEND_API_KEY } from "astro:env/server";

export const emailConfigured = Boolean(RESEND_API_KEY && EMAIL_FROM);

interface Email {
    to: string;
    subject: string;
    text: string;
    html: string;
}

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

export function magicLinkEmail(to: string, url: string, eventTitle: string | null): Email {
    if (eventTitle) {
        return {
            to,
            subject: `confirm your rsvp: ${eventTitle}`,
            text: [
                `tap the link to confirm you're coming to ${eventTitle}:`,
                "",
                url,
                "",
                "it works once and expires in 5 minutes.",
                "if you didn't rsvp, you can ignore this email.",
            ].join("\n"),
            html: `<p>tap the link to confirm you're coming to ${escapeHtml(eventTitle)}:</p>
<p><a href="${escapeHtml(url)}">confirm my rsvp</a></p>
<p>it works once and expires in 5 minutes.<br>if you didn't rsvp, you can ignore this email.</p>`,
        };
    }
    return {
        to,
        subject: "your live coders naarm login link",
        text: [
            "here's your link to log in to live coders naarm:",
            "",
            url,
            "",
            "it works once and expires in 5 minutes.",
            "if you didn't ask for it, you can ignore this email.",
        ].join("\n"),
        html: `<p>here's your link to log in to live coders naarm:</p>
<p><a href="${escapeHtml(url)}">log in</a></p>
<p>it works once and expires in 5 minutes.<br>if you didn't ask for it, you can ignore this email.</p>`,
    };
}
