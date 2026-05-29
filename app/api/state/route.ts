import { NextResponse } from 'next/server';
import { getDb, getCurrentWeek, getMode, getTeamBudgetInfo, ADMIN_PASSWORD } from '@/lib/db';

export function GET() {
  const db = getDb();
  const currentWeek = getCurrentWeek();
  const mode = getMode();

  const teams = db.prepare('SELECT * FROM teams ORDER BY name').all();

  const players = db.prepare(`
    SELECT p.*,
      pp.team_id as pp_team_id, pp.amount as pp_amount, pp.week_established as pp_week,
      t.name as pp_team_name,
      sp.team_id as signed_team_id, sp.amount as signed_amount, st.name as signed_team_name
    FROM players p
    LEFT JOIN pole_positions pp ON pp.player_id = p.id
    LEFT JOIN teams t ON t.id = pp.team_id
    LEFT JOIN signed_players sp ON sp.player_id = p.id
    LEFT JOIN teams st ON st.id = sp.team_id
    ORDER BY p.position, p.name
  `).all();

  // Current week bids
  const bids = db.prepare(`
    SELECT b.*, t.name as team_name
    FROM bids b
    JOIN teams t ON t.id = b.team_id
    WHERE b.week = ?
    ORDER BY b.player_id, b.amount DESC
  `).all(currentWeek);

  const signedPlayers = db.prepare(`
    SELECT sp.*, p.name as player_name, p.position, p.contract_years, t.name as team_name
    FROM signed_players sp
    JOIN players p ON p.id = sp.player_id
    JOIN teams t ON t.id = sp.team_id
    ORDER BY sp.week_signed DESC, p.name
  `).all();

  const budgets = (teams as { id: string }[]).map((team) => ({
    team_id: team.id,
    ...getTeamBudgetInfo(team.id, currentWeek),
  }));

  // Strip passwords from teams for client; include separately for admin use
  const teamsPublic = (teams as { id: string; name: string; budget: number; password: string }[])
    .map(({ password: _pw, ...t }) => t);

  const passwords = (teams as { id: string; name: string; password: string }[])
    .map(t => ({ team_id: t.id, team_name: t.name, password: t.password }));

  return NextResponse.json({
    currentWeek,
    mode,
    teams: teamsPublic,
    players,
    bids,
    signedPlayers,
    budgets,
    passwords,
    adminPassword: ADMIN_PASSWORD,
  });
}
