import { queryOne } from '../database/pgDb';
import { AuthRequest } from '../middleware/auth';

// Resolves the calling HOD's own department (or null if not an HOD, or an
// HOD with no department assigned yet). Every HOD-scoped endpoint calls this
// and, when it returns a real id, hard-filters its query to that department
// — the client is never trusted to send the right department_id itself,
// since an HOD hitting the endpoint directly with a different id must not
// be able to see another department's data.
//
// Shared here (rather than the private copy that used to live only in
// substitutions.ts) so teachers.ts, tests.ts and reports.ts can all reuse
// the exact same rule instead of re-implementing it slightly differently.
export async function resolveHodDepartmentId(req: AuthRequest): Promise<string | null> {
  if (req.user!.role !== 'HOD') return null;
  const dept = await queryOne<{ id: string }>(`SELECT id FROM departments WHERE hod_user_id = $1`, [req.user!.id]);
  return dept ? dept.id : null;
}
