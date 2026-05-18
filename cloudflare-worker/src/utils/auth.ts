import type { Env } from '../types';

export async function requireUser(request: Request, env: Env): Promise<string> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) throw httpError(401, 'Authorization required');
  const token = auth.slice(7);

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!res.ok) throw httpError(401, 'Invalid authentication token');

  const user = await res.json();
  if (!user?.id) throw httpError(401, 'User ID not found');
  return user.id as string;
}

export function httpError(status: number, message: string, details?: any) {
  const err = new Error(message) as Error & { status: number; details?: any };
  err.status = status; err.details = details;
  return err;
}
