import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DB_PATH } from '@/lib/db';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Basic SQLite magic-number check (first 16 bytes: "SQLite format 3\000")
  const magic = buffer.slice(0, 15).toString('utf8');
  if (!magic.startsWith('SQLite format 3')) {
    return NextResponse.json({ error: 'File does not appear to be a valid SQLite database' }, { status: 400 });
  }

  // Backup existing DB first
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, DB_PATH + '.bak');
  }

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(DB_PATH, buffer);

  // Force the db singleton to reinitialise on next request
  const { resetDb } = await import('@/lib/db');
  resetDb();

  return NextResponse.json({ success: true });
}
