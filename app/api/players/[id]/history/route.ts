import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const bids = db.prepare(`
    SELECT b.*, t.name as team_name
    FROM bids b
    JOIN teams t ON t.id = b.team_id
    WHERE b.player_id = ?
    ORDER BY b.week DESC, b.amount DESC
  `).all(parseInt(id));

  return NextResponse.json({ bids });
}
