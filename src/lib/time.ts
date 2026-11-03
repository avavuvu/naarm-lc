// Events are entered and shown in Melbourne time, whatever the viewer's device says
export const TIME_ZONE = "Australia/Melbourne";

const partsFormat = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});

function melbourneParts(date: Date) {
    const parts = Object.fromEntries(
        partsFormat.formatToParts(date).map((part) => [part.type, part.value]),
    );
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}`,
    };
}

// How far Melbourne's clock is ahead of UTC at a given instant
function offsetAt(instant: number) {
    const { date, time } = melbourneParts(new Date(instant));
    return Date.parse(`${date}T${time}Z`) - Math.floor(instant / 60_000) * 60_000;
}

/** "2026-11-20" + "18:30" in Melbourne → the instant it refers to */
export function fromMelbourne(date: string, time: string): Date {
    const wallClock = Date.parse(`${date}T${time}Z`);
    // Twice, in case the first guess lands on the other side of a daylight saving change
    let instant = wallClock - offsetAt(wallClock);
    instant = wallClock - offsetAt(instant);
    return new Date(instant);
}

/** Values for <input type="date"> and <input type="time"> */
export function toMelbourne(date: Date) {
    return melbourneParts(date);
}

const dayFormat = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-AU", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
});

/** e.g. "Thu, 20 Nov 2026, 6:30 pm – 9:00 pm" */
export function formatEventTime(startsAt: Date, endsAt: Date) {
    return `${dayFormat.format(startsAt)}, ${timeFormat.format(startsAt)} – ${timeFormat.format(endsAt)}`;
}
