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

function offsetAt(instant: number) {
    const { date, time } = melbourneParts(new Date(instant));
    return Date.parse(`${date}T${time}Z`) - Math.floor(instant / 60_000) * 60_000;
}

export function fromMelbourne(date: string, time: string): Date {
    const wallClock = Date.parse(`${date}T${time}Z`);
    let instant = wallClock - offsetAt(wallClock);
    instant = wallClock - offsetAt(instant);
    return new Date(instant);
}

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

export function formatEventTime(startsAt: Date, endsAt: Date) {
    return `${dayFormat.format(startsAt)}, ${timeFormat.format(startsAt)} – ${timeFormat.format(endsAt)}`.toLowerCase();
}
