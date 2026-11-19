<script lang="ts">
    type Values = { name: string; alias: string | null; bio: string | null; image: string | null; links: string[] };

    const { profile }: { profile: Values } = $props();
</script>

<label for="name">name</label>
<input id="name" name="name" required maxlength="64" autocomplete="name" value={profile.name} />

<label for="alias">also known as (optional)</label>
<input id="alias" name="alias" maxlength="64" placeholder="your artist name or handle" value={profile.alias ?? ""} />

<label for="image">picture (optional, a url to an image)</label>
<input id="image" name="image" maxlength="500" placeholder="https://…" value={profile.image ?? ""} />

<label for="links">links (optional, one per line)</label>
<textarea id="links" name="links" rows="4" placeholder="https://instagram.com/…" value={profile.links.join("\n")}></textarea>

<label for="bio">about you (optional)</label>
<textarea id="bio" name="bio" rows="5" maxlength="2000" value={profile.bio ?? ""}></textarea>
