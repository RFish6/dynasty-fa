import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'fa.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

const TEAM_PASSWORDS: Record<string, string> = {
  fish: 'fish25',
  keller: 'keller25',
  toffler: 'toffler25',
  nick: 'nick25',
  nate: 'nate25',
  jimmy: 'jimmy25',
  depo: 'depo25',
  james: 'james25',
  adam: 'adam25',
  norton: 'norton25',
};

export const ADMIN_PASSWORD = 'commish25';

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      budget INTEGER NOT NULL,
      password TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      contract_years INTEGER NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pole_positions (
      player_id INTEGER PRIMARY KEY,
      team_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      week_established INTEGER NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      team_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      week INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS signed_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      team_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      week_signed INTEGER NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );
  `);

  // Seed settings
  const week = db.prepare('SELECT value FROM settings WHERE key = ?').get('current_week') as { value: string } | undefined;
  if (!week) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('current_week', '1');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('mode', 'test');
  }

  // Add password column if missing (migration for existing DBs)
  const cols = (db.pragma('table_info(teams)') as { name: string }[]).map(c => c.name);
  if (!cols.includes('password')) {
    db.exec(`ALTER TABLE teams ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
  }

  // Seed teams
  const teamCount = (db.prepare('SELECT COUNT(*) as c FROM teams').get() as { c: number }).c;
  if (teamCount === 0) {
    const teams = [
      { id: 'fish', name: 'Fish', budget: 115 },
      { id: 'keller', name: 'Keller', budget: 115 },
      { id: 'toffler', name: 'Toffler', budget: 75 },
      { id: 'nick', name: 'Nick', budget: 115 },
      { id: 'nate', name: 'Nate', budget: 115 },
      { id: 'jimmy', name: 'Jimmy', budget: 140 },
      { id: 'depo', name: 'Depo', budget: 115 },
      { id: 'james', name: 'James', budget: 115 },
      { id: 'adam', name: 'Adam', budget: 115 },
      { id: 'norton', name: 'Norton', budget: 115 },
    ];
    const insert = db.prepare('INSERT INTO teams (id, name, budget, password) VALUES (?, ?, ?, ?)');
    for (const t of teams) insert.run(t.id, t.name, t.budget, TEAM_PASSWORDS[t.id] || '');
  } else {
    // Backfill passwords for existing rows
    const update = db.prepare('UPDATE teams SET password = ? WHERE id = ? AND password = ?');
    for (const [id, pw] of Object.entries(TEAM_PASSWORDS)) {
      update.run(pw, id, '');
    }
  }
}

export function getCurrentWeek(): number {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('current_week') as { value: string };
  return parseInt(row.value);
}

export function getMode(): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('mode') as { value: string };
  return row.value;
}

export interface Team {
  id: string;
  name: string;
  budget: number;
}

export interface Player {
  id: number;
  name: string;
  position: string;
  contract_years: number;
  is_available: number;
}

export interface PolePosition {
  player_id: number;
  team_id: string;
  amount: number;
  week_established: number;
}

export interface Bid {
  id: number;
  player_id: number;
  team_id: string;
  amount: number;
  week: number;
  created_at: string;
}

export interface SignedPlayer {
  id: number;
  player_id: number;
  team_id: string;
  amount: number;
  week_signed: number;
}

export function getTeamBudgetInfo(teamId: string, currentWeek: number) {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as Team;

  // Signed costs
  const signed = db.prepare(`
    SELECT COALESCE(SUM(sp.amount), 0) as total
    FROM signed_players sp WHERE sp.team_id = ?
  `).get(teamId) as { total: number };

  // Pole positions held
  const poleCosts = db.prepare(`
    SELECT COALESCE(SUM(pp.amount), 0) as total
    FROM pole_positions pp WHERE pp.team_id = ?
  `).get(teamId) as { total: number };

  // Current week bids on players where this team does NOT hold pole position
  const bidCosts = db.prepare(`
    SELECT COALESCE(SUM(b.amount), 0) as total
    FROM bids b
    WHERE b.team_id = ? AND b.week = ?
      AND NOT EXISTS (
        SELECT 1 FROM pole_positions pp
        WHERE pp.player_id = b.player_id AND pp.team_id = b.team_id
      )
  `).get(teamId, currentWeek) as { total: number };

  const committed = signed.total + poleCosts.total + bidCosts.total;
  return {
    budget: team.budget,
    committed,
    available: team.budget - committed,
    signedCost: signed.total,
    poleCost: poleCosts.total,
    bidCost: bidCosts.total,
  };
}
