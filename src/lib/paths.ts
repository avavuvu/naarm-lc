import slugify from "slugify";

export function eventPath(event: { id: number; title: string }) {
    const slug = slugify(event.title, { lower: true, strict: true });
    return slug ? `/events/${event.id}-${slug}` : `/events/${event.id}`;
}

export function eventIdFromParam(param: string | undefined) {
    const id = Number(param?.match(/^\d+/)?.[0]);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
