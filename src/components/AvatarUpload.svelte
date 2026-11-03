<script lang="ts">
    import { actions } from "astro:actions";

    const { hasUpload }: { hasUpload: boolean } = $props();

    const SIZE = 256;

    let status = $state<"idle" | "working">("idle");
    let error = $state("");

    // Square-crop and shrink to a small JPEG. Re-encoding also drops photo
    // metadata such as location.
    async function toAvatarJpeg(file: File) {
        const bitmap = await createImageBitmap(file);
        const side = Math.min(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SIZE;
        canvas
            .getContext("2d")!
            .drawImage(
                bitmap,
                (bitmap.width - side) / 2,
                (bitmap.height - side) / 2,
                side,
                side,
                0,
                0,
                SIZE,
                SIZE,
            );
        bitmap.close();
        return new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject()), "image/jpeg", 0.85),
        );
    }

    async function upload(event: Event) {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        if (!file) return;
        error = "";
        status = "working";
        try {
            const form = new FormData();
            form.append("picture", await toAvatarJpeg(file), "avatar.jpg");
            const result = await actions.profile.uploadAvatar(form);
            if (result.error) throw result.error;
            window.location.reload();
        } catch {
            error = "That picture couldn't be used. Try a JPEG or PNG.";
            status = "idle";
        }
    }

    async function remove() {
        status = "working";
        await actions.profile.removeAvatar();
        window.location.reload();
    }
</script>

<div class="flex flex-wrap items-center gap-4">
    <label class="button">
        {status === "working" ? "working…" : "upload a picture"}
        <input
            class="sr-only"
            type="file"
            accept="image/*"
            disabled={status === "working"}
            onchange={upload}
        />
    </label>
    {#if hasUpload}
        <button type="button" class="button" disabled={status === "working"} onclick={remove}>
            remove picture
        </button>
    {/if}
</div>
{#if error}
    <p role="alert">{error}</p>
{/if}

<style>
    .button {
        border: 1px solid var(--color-primary);
        padding: 0.25rem 0.5rem;
        text-decoration: underline;
        cursor: pointer;
    }
</style>
