import pg from "pg";

const [email, flag] = process.argv.slice(2);
if (!email) {
    console.error("Usage: bun run make-admin <email> [--remove]");
    process.exit(1);
}

const role = flag === "--remove" ? "member" : "admin";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
    `update "user" set role = $1, updated_at = now() where lower(email) = lower($2) returning name, email, role`,
    [role, email],
);
await client.end();

if (rows.length === 0) {
    console.error(`No member found with email "${email}"`);
    process.exit(1);
}
for (const user of rows) console.log(`${user.name} <${user.email}> is now ${user.role}`);
