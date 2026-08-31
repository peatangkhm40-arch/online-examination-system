import type { Role } from '@/types';

export function getHomeRoute(
  role: Role
): '/(app)/dashboard' | '/(teacher)/home' | '/(admin)/home' {
  if (role === 'TEACHER') return '/(teacher)/home';
  if (role === 'ADMIN') return '/(admin)/home';
  return '/(app)/dashboard';
}

export function isTeacher(role?: Role): boolean {
  return role === 'TEACHER';
}

export function isStudent(role?: Role): boolean {
  return role === 'STUDENT';
}

export function isAdmin(role?: Role): boolean {
  return role === 'ADMIN';
}
