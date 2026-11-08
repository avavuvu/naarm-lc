# naarm.lc
live coders naarm are a community of live coders in Melbourne, Australia

## development
- `docker compose up -d` creates a local postgres db on 5440
- fill BETTER_AUTH_SECRET with any long random string (like `openssl rand -base64 32`)
- `bun install`, `bun run db:migrate`, `astro dev`
- run `bun run make-admin test@example.com`

Fill in Discord/Resend env vars to test Discord oauth locally.
