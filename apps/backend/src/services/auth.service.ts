import prisma from '../config/database.js';
import { User } from '@prisma/client';

export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: { givenName: string; familyName: string };
  photos?: Array<{ value: string }>;
}

export async function findOrCreateUser(profile: GoogleProfile): Promise<{ user: User; isNew: boolean }> {
  const googleId = profile.id;
  const email = profile.emails[0].value;
  const name = `${profile.name.givenName} ${profile.name.familyName}`;
  const avatarUrl = profile.photos?.[0]?.value;

  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (user) {
    return { user, isNew: false };
  }

  user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    user = await prisma.user.update({
      where: { email },
      data: { googleId },
    });
    return { user, isNew: false };
  }

  user = await prisma.user.create({
    data: {
      googleId,
      email,
      name,
      avatarUrl,
    },
  });

  return { user, isNew: true };
}

export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { googleId },
  });
}
