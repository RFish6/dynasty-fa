import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DB_PATH, resetDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Basic SQLite magic-number check
  const magic = buffer.slice(0, 15).toString('utf8');
  if (!magic.startsWith('SQLite format 3')) {
    return NextResponse.json({ error: 'File does not appear to be a valid SQLite database' }, { status: 400 });
  }

  // Close the existing DB connection before touching files
  resetDb();

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Remove WAL and SHM files so the old WAL isn't replayed on top of the new DB
  const walPath = DB_PATH + '-wal';
  const shmPath = DB_PATH + '-shm';
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  // Backup existing DB then write the new one
  if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, DB_PATH + '.bak');
  fs.writeFileSync(DB_PATH, buffer);

  return NextResponse.json({ success: true });
}
