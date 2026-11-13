import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { isAdmin } from "@/auth";
import { sameOrigin } from "@/lib/http";

const MAX = 4 * 1024 * 1024;

/** The real type is read from the file's first bytes, never from its name or declared MIME type. */
function sniff(b: Uint8Array): { ext: string; type: string } | null {
  const hex = (n: number) => Array.from(b.slice(0, n), (x) => x.toString(16).padStart(2, "0")).join("");
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (hex(3) === "ffd8ff") return { ext: "jpg", type: "image/jpeg" };
  if (hex(8) === "89504e470d0a1a0a") return { ext: "png", type: "image/png" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return { ext: "avif", type: "image/avif" };
  return null;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!(await sameOrigin())) return Response.json({ error: "Origen no permitido" }, { status: 403 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No se ha recibido ningún archivo." }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "La imagen pesa más de 4 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return Response.json({ error: "Formato no admitido. Usa JPG, PNG, WebP o AVIF." }, { status: 415 });
  const name = `${randomUUID()}.${kind.ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`barberia/${name}`, Buffer.from(bytes), { access: "public", contentType: kind.type });
    return Response.json({ url: blob.url });
  }
  if (process.env.VERCEL) {
    return Response.json({ error: "La subida de fotos no está activada. Conecta Vercel Blob (ver docs/DESPLIEGUE.md) o pega la dirección https:// de la imagen." }, { status: 501 });
  }
  // Local development only.
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return Response.json({ url: `/uploads/${name}` });
}
