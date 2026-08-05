import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// Deleting an account has to remove the uploaded files too, not just the
// rows that point at them. Every relation cascades from User, so a single
// user.delete() clears the database -- but the photos themselves live in
// Blob storage, and cascade knows nothing about those. Left alone they'd
// survive the "deletion" entirely, which is the one outcome this feature
// exists to prevent.
export const maxDuration = 60;

// Only files this app uploaded can be deleted. An avatar can also be an
// OAuth provider's URL (Google's, say), which isn't ours to touch and
// isn't stored on our infrastructure either.
function isOwnUpload(url: string | null | undefined): url is string {
  return !!url && /\.public\.blob\.vercel-storage\.com\//.test(url);
}

export async function DELETE(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, image: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The typed confirmation is re-checked here rather than trusted from
  // the client, since this is irreversible and a stray request to this
  // endpoint would otherwise be enough to wipe an account.
  const body = await request.json().catch(() => null);
  const confirm = typeof body?.confirm === "string" ? body.confirm.trim() : "";
  if (confirm.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Type your email address exactly to confirm" },
      { status: 400 },
    );
  }

  // Gathered before the delete, because afterwards the rows naming these
  // files are gone and the blobs would be unreachable orphans.
  const [photos, translations] = await Promise.all([
    prisma.photo.findMany({
      where: { trip: { userId } },
      select: { filePath: true },
    }),
    prisma.translation.findMany({
      where: { userId },
      select: { imageUrl: true },
    }),
  ]);

  const urls = [
    ...photos.map((p) => p.filePath),
    ...translations.map((t) => t.imageUrl),
    user.image,
  ].filter(isOwnUpload);

  // Storage cleanup is best-effort and must not strand the user in a
  // half-deleted state: if a blob delete fails, the account still goes.
  // A leftover unreferenced file is recoverable; a user who asked to be
  // deleted and wasn't is not.
  await Promise.all(urls.map((url) => del(url).catch(() => null)));

  // Cascades take the trips, locations, photos, widgets, translations,
  // stamps, collaborator rows, sessions and OAuth accounts with it.
  // Trips this user only collaborated on survive -- they belong to
  // whoever owns them; this user is simply removed from them.
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true, filesDeleted: urls.length });
}
