// Usage: bun run make-admin <email or username> [--remove]
// Uses DATABASE_URL from .env.local, so check which Neon branch it points at first
import { neon } from "@neondatabase/serverless";

const [who, flag] = process.argv.slice(2);
if (!who) {
    console.error("Usage: bun run make-admin <email or username> [--remove]");
    process.exit(1);
}

const role = flag === "--remove" ? "member" : "admin";
const sql = neon(process.env.DATABASE_URL!);
const updated = await sql`
    update "user" set role = ${role}, updated_at = now()
    where lower(email) = lower(${who}) or username = lower(${who})
    returning name, email, role`;

if (updated.length === 0) {
    console.error(`No member found with email or username "${who}"`);
    process.exit(1);
}
for (const user of updated) console.log(`${user.name} <${user.email}> is now ${user.role}`);
