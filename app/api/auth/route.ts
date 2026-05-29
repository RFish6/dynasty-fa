import { NextRequest, NextResponse } from 'next/server';
import { getDb, ADMIN_PASSWORD } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { team_id, password } = await req.json();

  if (team_id === 'admin') {
    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true, role: 'admin' });
    }
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id) as { id: string; name: string; password: string } | undefined;

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.password !== password) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });

  return NextResponse.json({ success: true, role: 'team', team_id: team.id, team_name: team.name });
}
