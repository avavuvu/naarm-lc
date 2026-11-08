import { EMAIL_FROM, RESEND_API_KEY } from "astro:env/server";

export const emailConfigured = Boolean(RESEND_API_KEY && EMAIL_FROM);

export async function emailMagicLink(to: string, url: string, eventTitle: string | null) {
    const subject = eventTitle ? `confirm your rsvp: ${eventTitle}` : "your live coders naarm login link";
    const text = [
        eventTitle ? `click here to confirm you're coming to ${eventTitle}:` : "click here to log in to live coders naarm:",
        url,
        "this link expires in 5 minutes. if you didn't ask for it, you can ignore this email.",
    ].join("\n\n");

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text }),
    });
    if (!response.ok) throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
}
