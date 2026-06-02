import { NextResponse } from 'next/server';
import fs from 'fs';
import { DB_PATH, getDb } from '@/lib/db';

export async function GET() {
  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: 'Database not found' }, { status: 404 });
  }

  // Checkpoint WAL so all committed data is flushed into the main .db file
  const db = getDb();
  db.pragma('wal_checkpoint(TRUNCATE)');

  const file = fs.readFileSync(DB_PATH);
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="fa.db"',
    },
  });
}
