import "server-only";
import { db } from "./db";

export async function getSettings() {
  return (await db.setting.findUnique({ where: { id: 1 } })) ?? (await db.setting.create({ data: { id: 1 } }));
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;
