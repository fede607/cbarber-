import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/** Idempotent: creates provisional content only where nothing exists yet. Never overwrites edits. */
async function main() {
  await db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (let weekday = 0; weekday <= 6; weekday++) {
    const closed = weekday === 0 || weekday === 1;
    const saturday = weekday === 6;
    await db.weeklyHours.upsert({
      where: { weekday },
      update: {},
      create: {
        weekday,
        closed,
        openMin: 10 * 60,
        closeMin: saturday ? 14 * 60 : 20 * 60,
        breakStartMin: saturday || closed ? null : 14 * 60,
        breakEndMin: saturday || closed ? null : 16 * 60,
      },
    });
  }

  if ((await db.service.count()) === 0) {
    await db.service.createMany({
      data: [
        { name: "Corte clásico", description: "Tijera y máquina, lavado y peinado.", priceCents: 1500, durationMin: 30, sortOrder: 1 },
        { name: "Degradado", description: "Fade bajo, medio o alto, perfilado a navaja.", priceCents: 1700, durationMin: 40, sortOrder: 2 },
        { name: "Corte y barba", description: "Corte completo y arreglo de barba con toalla caliente.", priceCents: 2300, durationMin: 55, sortOrder: 3 },
        { name: "Arreglo de barba", description: "Rebaje, perfilado a navaja y aceite.", priceCents: 1000, durationMin: 20, sortOrder: 4 },
        { name: "Afeitado clásico", description: "Navaja, toalla caliente y bálsamo.", priceCents: 1400, durationMin: 30, sortOrder: 5 },
        { name: "Corte infantil", description: "Hasta 12 años.", priceCents: 1200, durationMin: 25, sortOrder: 6 },
      ],
    });
  }

  if ((await db.galleryImage.count()) === 0) {
    await db.galleryImage.createMany({
      data: [1, 2, 3, 4, 5, 6].map((n) => ({ url: `/placeholders/gallery-${n}.svg`, alt: `Imagen provisional ${n}`, sortOrder: n })),
    });
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
    const existing = await db.adminUser.findUnique({ where: { email } });
    if (!existing) {
      await db.adminUser.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } });
      console.log(`Administrador creado: ${email}`);
    }
  } else if ((await db.adminUser.count()) === 0) {
    console.warn("Sin ADMIN_EMAIL / ADMIN_PASSWORD: no se ha creado ningún administrador.");
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
