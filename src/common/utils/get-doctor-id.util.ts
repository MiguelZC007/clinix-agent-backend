import { UnauthorizedException } from '@nestjs/common';

interface UserWithDoctor {
  id: string;
  email: string;
  doctor?: {
    id: string;
  };
}

/**
 * Extracts the doctor ID from an authenticated user object.
 * @param user - The user object from the JWT payload
 * @returns The doctor ID string
 * @throws UnauthorizedException if user is missing or has no doctor association
 */
export function getDoctorId(user: unknown): string {
  if (!user) {
    throw new UnauthorizedException('user-not-authenticated');
  }

  const typedUser = user as UserWithDoctor;

  if (!typedUser.doctor?.id) {
    throw new UnauthorizedException('user-is-not-doctor');
  }

  return typedUser.doctor.id;
}
