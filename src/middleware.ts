import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    context.locals.user = null;
    context.locals.session = null;

    if (context.isPrerendered) return next();

    const { auth } = await import("./lib/auth");
    const result = await auth.api.getSession({ headers: context.request.headers });
    if (result) {
        context.locals.user = result.user;
        context.locals.session = result.session;
    }

    return next();
});
