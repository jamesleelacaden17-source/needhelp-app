import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

// 1x1 placeholder PNG, used to demo the ID verification pipeline without real documents.
const PLACEHOLDER_ID_PHOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function writePlaceholderIdPhoto(userId: string): Promise<string> {
  const storageDir = path.join(process.cwd(), "storage", "id-photos");
  await mkdir(storageDir, { recursive: true });
  const filename = `${userId}-seed.png`;
  await writeFile(path.join(storageDir, filename), PLACEHOLDER_ID_PHOTO);
  return filename;
}

type ProviderCategory = "CLEANING" | "AIRCON" | "LAUNDRY";

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
  providerCategory?: ProviderCategory;
  isOnline?: boolean;
  ratingSum?: number;
  ratingCount?: number;
  verificationStatus?: "UNSUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  withIdPhoto?: boolean;
  rejectionReason?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      providerCategory: data.providerCategory,
      isOnline: data.isOnline ?? false,
      ratingSum: data.ratingSum ?? 0,
      ratingCount: data.ratingCount ?? 0,
      verificationStatus: data.verificationStatus ?? "UNSUBMITTED",
      rejectionReason: data.rejectionReason,
    },
  });

  if (data.withIdPhoto && !user.idPhotoPath) {
    const filename = await writePlaceholderIdPhoto(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { idPhotoPath: filename, idPhotoSubmittedAt: new Date() },
    });
  }

  return user;
}

async function main() {
  await upsertUser({
    name: "Admin",
    email: "admin@needhelp.test",
    password: "admin123",
    role: "ADMIN",
  });

  // Home Cleaning
  await upsertUser({
    name: "Alex Rivera",
    email: "alex.cleaning@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "CLEANING",
    isOnline: true,
    ratingSum: 47,
    ratingCount: 10,
    verificationStatus: "APPROVED",
    withIdPhoto: true,
  });
  await upsertUser({
    name: "Jordan Blake",
    email: "jordan.cleaning@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "CLEANING",
    isOnline: true,
    ratingSum: 40,
    ratingCount: 8,
    verificationStatus: "APPROVED",
    withIdPhoto: true,
  });
  await upsertUser({
    name: "Sam Nguyen",
    email: "sam.cleaning@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "CLEANING",
    verificationStatus: "PENDING",
    withIdPhoto: true,
  });
  await upsertUser({
    name: "Maria Santos",
    email: "maria.cleaning@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "CLEANING",
    verificationStatus: "UNSUBMITTED",
  });

  // Aircon Cleaning
  await upsertUser({
    name: "Ramon Cruz",
    email: "ramon.aircon@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "AIRCON",
    isOnline: true,
    ratingSum: 44,
    ratingCount: 9,
    verificationStatus: "APPROVED",
    withIdPhoto: true,
  });

  // Laundry Service
  await upsertUser({
    name: "Liza Domingo",
    email: "liza.laundry@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "LAUNDRY",
    isOnline: true,
    ratingSum: 46,
    ratingCount: 10,
    verificationStatus: "APPROVED",
    withIdPhoto: true,
  });

  await upsertUser({
    name: "Test Customer",
    email: "customer@needhelp.test",
    password: "customer123",
    role: "CUSTOMER",
  });

  console.log("Seed complete. Sample accounts (password shown per account):");
  console.log("  admin@needhelp.test / admin123");
  console.log("  alex.cleaning@needhelp.test / provider123 (cleaning, verified, online)");
  console.log("  jordan.cleaning@needhelp.test / provider123 (cleaning, verified, online)");
  console.log("  sam.cleaning@needhelp.test / provider123 (cleaning, ID pending review)");
  console.log("  maria.cleaning@needhelp.test / provider123 (cleaning, no ID submitted)");
  console.log("  ramon.aircon@needhelp.test / provider123 (aircon, verified, online)");
  console.log("  liza.laundry@needhelp.test / provider123 (laundry, verified, online)");
  console.log("  customer@needhelp.test / customer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
