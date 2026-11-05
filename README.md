# naarm.lc
live coders naarm are a community of live coders in Melbourne, Australia

## development
- `docker compose up -d` creates a local postgres db on 5440
- fill BETTER_AUTH_SECRET with any long random string (like `openssl rand -base64 32`)
- `bun install`, `bun run db:migrate`, `astro dev`
- run `bun run make-admin test@example.com`

### dependencies

#### to run locally
- [bun](https://bun.sh) 
- [node](https://nodejs.org) 22.12 or newer
- [docker](https://www.docker.com) 

#### packages
- astro
- svelte
- tailwind
- better auth 
    - for email link and discord login
- drizzle
    -  for the database schema, queries and migrations

#### production services
- web hosting: netlify
- database: neon
- emails: resend (can be swapped for amazon ses if we hit limit (unlikely))



Fill in Discord/Resend env vars to test Discord oauth locally.
