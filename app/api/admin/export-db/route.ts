import { NextResponse } from 'next/server';
import fs from 'fs';
import { DB_PATH } from '@/lib/db';

export async function GET() {
  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: 'Database not found' }, { status: 404 });
  }

  const file = fs.readFileSync(DB_PATH);
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="fa.db"',
    },
  });
}
