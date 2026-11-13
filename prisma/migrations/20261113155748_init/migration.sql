-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('WEB', 'ADMIN');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Barbería Carlos',
    "heroTitle" TEXT NOT NULL DEFAULT 'Una silla. Un barbero. Tu corte.',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Cortes clásicos, degradados y arreglo de barba con cita previa. Sin prisas y sin esperas.',
    "aboutTitle" TEXT NOT NULL DEFAULT 'Carlos, detrás de la silla',
    "aboutText" TEXT NOT NULL DEFAULT 'Carlos atiende a una sola persona cada vez. Empieza escuchando lo que quieres, mira cómo crece tu pelo y termina cuando el corte está bien, no cuando suena el reloj.

Trabaja con tijera, máquina y navaja, y solo con cita: así la silla es tuya durante todo el servicio.',
    "heroImage" TEXT NOT NULL DEFAULT '/placeholders/hero.svg',
    "aboutImage" TEXT NOT NULL DEFAULT '/placeholders/about.svg',
    "address" TEXT NOT NULL DEFAULT 'Calle Ejemplo 12',
    "postalCity" TEXT NOT NULL DEFAULT '28000 Madrid',
    "phone" TEXT NOT NULL DEFAULT '+34 600 000 000',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT 'hola@example.com',
    "instagram" TEXT NOT NULL DEFAULT '',
    "tiktok" TEXT NOT NULL DEFAULT '',
    "mapLat" DOUBLE PRECISION NOT NULL DEFAULT 40.4168,
    "mapLng" DOUBLE PRECISION NOT NULL DEFAULT -3.7038,
    "ratingValue" DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "reviewsUrl" TEXT NOT NULL DEFAULT '',
    "showRating" BOOLEAN NOT NULL DEFAULT true,
    "slotStepMin" INTEGER NOT NULL DEFAULT 15,
    "minNoticeMin" INTEGER NOT NULL DEFAULT 120,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 45,
    "cancelLimitMin" INTEGER NOT NULL DEFAULT 120,
    "legalOwnerName" TEXT NOT NULL DEFAULT '[Nombre y apellidos del titular]',
    "legalOwnerId" TEXT NOT NULL DEFAULT '[NIF]',
    "legalAddress" TEXT NOT NULL DEFAULT '[Domicilio del titular]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "source" TEXT NOT NULL DEFAULT 'Google',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyHours" (
    "weekday" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "openMin" INTEGER NOT NULL DEFAULT 600,
    "closeMin" INTEGER NOT NULL DEFAULT 1200,
    "breakStartMin" INTEGER,
    "breakEndMin" INTEGER,

    CONSTRAINT "WeeklyHours_pkey" PRIMARY KEY ("weekday")
);

-- CreateTable
CREATE TABLE "ClosedDay" (
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ClosedDay_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "AppointmentSource" NOT NULL DEFAULT 'WEB',
    "manageTokenHash" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "reminderSentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "TimeBlock_startsAt_endsAt_idx" ON "TimeBlock"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_manageTokenHash_key" ON "Appointment"("manageTokenHash");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startsAt_idx" ON "Appointment"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
