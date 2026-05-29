import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { players, replace } = await req.json();

  if (!Array.isArray(players)) {
    return NextResponse.json({ error: 'players must be an array' }, { status: 400 });
  }

  const db = getDb();

  if (replace) {
    db.exec('DELETE FROM players');
  }

  const insert = db.prepare('INSERT INTO players (name, position, contract_years, is_available) VALUES (?, ?, ?, 1)');
  let count = 0;
  for (const p of players) {
    if (p.name && p.position && p.contract_years) {
      insert.run(p.name.trim(), p.position.trim().toUpperCase(), parseInt(p.contract_years));
      count++;
    }
  }

  return NextResponse.json({ success: true, imported: count });
}

// Seed some test players if none exist
export async function GET() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM players').get() as { c: number }).c;
  if (count === 0) {
    const testPlayers = [
      { name: 'CeeDee Lamb', position: 'WR', contract_years: 3 },
      { name: 'Tyreek Hill', position: 'WR', contract_years: 2 },
      { name: 'Jamarr Chase', position: 'WR', contract_years: 4 },
      { name: 'Justin Jefferson', position: 'WR', contract_years: 3 },
      { name: 'Christian McCaffrey', position: 'RB', contract_years: 2 },
      { name: 'Breece Hall', position: 'RB', contract_years: 3 },
      { name: 'Saquon Barkley', position: 'RB', contract_years: 2 },
      { name: 'Patrick Mahomes', position: 'QB', contract_years: 4 },
      { name: 'Josh Allen', position: 'QB', contract_years: 3 },
      { name: 'Sam LaPorta', position: 'TE', contract_years: 3 },
      { name: 'Kyle Pitts', position: 'TE', contract_years: 2 },
      { name: 'Travis Kelce', position: 'TE', contract_years: 1 },
    ];
    const insert = db.prepare('INSERT INTO players (name, position, contract_years, is_available) VALUES (?, ?, ?, 1)');
    for (const p of testPlayers) insert.run(p.name, p.position, p.contract_years);
  }
  return NextResponse.json({ count: (db.prepare('SELECT COUNT(*) as c FROM players').get() as { c: number }).c });
}
