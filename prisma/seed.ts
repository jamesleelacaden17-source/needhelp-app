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

async function writePlaceholderPhoto(userId: string, dirName: string): Promise<string> {
  const storageDir = path.join(process.cwd(), "storage", dirName);
  await mkdir(storageDir, { recursive: true });
  const filename = `${userId}-seed.png`;
  await writeFile(path.join(storageDir, filename), PLACEHOLDER_ID_PHOTO);
  return filename;
}

type ProviderCategory = "CLEANING" | "AIRCON" | "LAUNDRY";
type Gender = "MALE" | "FEMALE" | "OTHER";

async function upsertUser(data: {
  name: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "PROVIDER" | "ADMIN";
  providerCategory?: ProviderCategory;
  gender?: Gender;
  isOnline?: boolean;
  ratingSum?: number;
  ratingCount?: number;
  verificationStatus?: "UNSUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
  withIdPhoto?: boolean;
  withProfilePhoto?: boolean;
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
      gender: data.gender,
      isOnline: data.isOnline ?? false,
      ratingSum: data.ratingSum ?? 0,
      ratingCount: data.ratingCount ?? 0,
      verificationStatus: data.verificationStatus ?? "UNSUBMITTED",
      rejectionReason: data.rejectionReason,
    },
  });

  if (data.withIdPhoto && !user.idPhotoPath) {
    const filename = await writePlaceholderPhoto(user.id, "id-photos");
    await prisma.user.update({
      where: { id: user.id },
      data: { idPhotoPath: filename, idPhotoSubmittedAt: new Date() },
    });
  }

  if (data.withProfilePhoto && !user.profilePhotoPath) {
    const filename = await writePlaceholderPhoto(user.id, "profile-photos");
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePhotoPath: filename, profilePhotoSubmittedAt: new Date() },
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
    gender: "MALE",
    isOnline: true,
    ratingSum: 47,
    ratingCount: 10, // 4.7 avg — verified, but below the Superman/Superwoman bar
    verificationStatus: "APPROVED",
    withIdPhoto: true,
    withProfilePhoto: true,
  });
  await upsertUser({
    name: "Jordan Blake",
    email: "jordan.cleaning@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "CLEANING",
    gender: "FEMALE",
    isOnline: true,
    ratingSum: 40,
    ratingCount: 8, // 5.0 avg over 8 jobs — qualifies for "Superwoman"
    verificationStatus: "APPROVED",
    withIdPhoto: true,
    withProfilePhoto: true,
  });
  await upsertUser({
    name: "Sam Nguyen",
    email: "sam.cleaning@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "CLEANING",
    gender: "MALE",
    verificationStatus: "PENDING",
    withIdPhoto: true, // no profile photo yet — demonstrates the admin queue gating on it
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
    gender: "MALE",
    isOnline: true,
    ratingSum: 44,
    ratingCount: 9, // 4.89 avg — qualifies for "Superman"
    verificationStatus: "APPROVED",
    withIdPhoto: true,
    withProfilePhoto: true,
  });

  // Laundry Service
  await upsertUser({
    name: "Liza Domingo",
    email: "liza.laundry@needhelp.test",
    password: "provider123",
    role: "PROVIDER",
    providerCategory: "LAUNDRY",
    gender: "FEMALE",
    isOnline: true,
    ratingSum: 46,
    ratingCount: 10, // 4.6 avg — verified, but below the Superman/Superwoman bar
    verificationStatus: "APPROVED",
    withIdPhoto: true,
    withProfilePhoto: true,
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
  console.log("  jordan.cleaning@needhelp.test / provider123 (cleaning, verified, online, Superwoman)");
  console.log("  sam.cleaning@needhelp.test / provider123 (cleaning, ID pending, no profile photo)");
  console.log("  maria.cleaning@needhelp.test / provider123 (cleaning, no ID submitted)");
  console.log("  ramon.aircon@needhelp.test / provider123 (aircon, verified, online, Superman)");
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
