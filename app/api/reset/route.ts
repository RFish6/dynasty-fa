import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { confirm, mode } = await req.json();
  if (!confirm) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });

  const db = getDb();
  db.exec('DELETE FROM bids');
  db.exec('DELETE FROM pole_positions');
  db.exec('DELETE FROM signed_players');
  db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('1', 'current_week');
  if (mode) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(mode, 'mode');
  }

  return NextResponse.json({ success: true });
}
