import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    context.locals.user = null;
    context.locals.session = null;

    // Static pages have no request to read a session from. They're also rendered
    // at build time, where the database and auth secrets aren't available, so
    // auth is only loaded for on-demand pages.
    if (context.isPrerendered) return next();

    const { auth } = await import("./lib/auth");
    const result = await auth.api.getSession({ headers: context.request.headers });
    if (result) {
        context.locals.user = result.user;
        context.locals.session = result.session;
    }

    // Admin pages; admin actions check the role themselves too
    if (context.url.pathname.startsWith("/admin") && context.locals.user?.role !== "admin") {
        return context.redirect(context.locals.user ? "/profile" : "/login");
    }

    return next();
});
