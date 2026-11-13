import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/email";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/reservar", "/privacidad", "/aviso-legal"].map((p) => ({ url: `${appUrl()}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
}
