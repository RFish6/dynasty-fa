import { NextResponse } from 'next/server';
import { getDb, getCurrentWeek } from '@/lib/db';

export async function POST() {
  const db = getDb();
  const currentWeek = getCurrentWeek();

  const advanceWeek = db.transaction(() => {
    const results: { signed: string[]; newPP: string[]; updatedPP: string[] } = {
      signed: [],
      newPP: [],
      updatedPP: [],
    };

    // Get all players with pole positions
    const polePositions = db.prepare('SELECT * FROM pole_positions').all() as {
      player_id: number;
      team_id: string;
      amount: number;
      week_established: number;
    }[];

    for (const pp of polePositions) {
      // Get highest bid this week for this player
      const highestBid = db.prepare(`
        SELECT b.*, t.name as team_name
        FROM bids b JOIN teams t ON t.id = b.team_id
        WHERE b.player_id = ? AND b.week = ?
        ORDER BY b.amount DESC, b.created_at ASC
        LIMIT 1
      `).get(pp.player_id, currentWeek) as { team_id: string; amount: number; team_name: string } | undefined;

      if (!highestBid || highestBid.amount <= pp.amount) {
        // No higher bid → SIGN the player
        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(pp.player_id) as { name: string };
        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(pp.team_id) as { name: string };
        db.prepare('INSERT INTO signed_players (player_id, team_id, amount, week_signed) VALUES (?, ?, ?, ?)').run(
          pp.player_id, pp.team_id, pp.amount, currentWeek
        );
        db.prepare('DELETE FROM pole_positions WHERE player_id = ?').run(pp.player_id);
        results.signed.push(`${player.name} → ${team.name} ($${pp.amount})`);
      } else {
        // Higher bid exists — check for ties among bids at max amount
        const maxAmount = highestBid.amount;
        const tiedBids = db.prepare(`
          SELECT * FROM bids WHERE player_id = ? AND week = ? AND amount = ?
        `).all(pp.player_id, currentWeek, maxAmount) as { team_id: string }[];

        let winningTeamId: string;
        if (tiedBids.length > 1) {
          winningTeamId = tiedBids[Math.floor(Math.random() * tiedBids.length)].team_id;
        } else {
          winningTeamId = tiedBids[0].team_id;
        }

        const player = db.prepare('SELECT * FROM players WHERE id = ?').get(pp.player_id) as { name: string };
        const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(winningTeamId) as { name: string };
        db.prepare('UPDATE pole_positions SET team_id = ?, amount = ?, week_established = ? WHERE player_id = ?').run(
          winningTeamId, maxAmount, currentWeek + 1, pp.player_id
        );
        results.updatedPP.push(`${player.name} → ${team.name} ($${maxAmount})`);
      }
    }

    // Players with bids this week but no existing PP
    const newBidPlayers = db.prepare(`
      SELECT DISTINCT b.player_id
      FROM bids b
      WHERE b.week = ? AND NOT EXISTS (
        SELECT 1 FROM pole_positions pp WHERE pp.player_id = b.player_id
      ) AND NOT EXISTS (
        SELECT 1 FROM signed_players sp WHERE sp.player_id = b.player_id
      )
    `).all(currentWeek) as { player_id: number }[];

    for (const { player_id } of newBidPlayers) {
      const maxAmount = (db.prepare('SELECT MAX(amount) as m FROM bids WHERE player_id = ? AND week = ?').get(player_id, currentWeek) as { m: number }).m;
      const tiedBids = db.prepare('SELECT * FROM bids WHERE player_id = ? AND week = ? AND amount = ?').all(player_id, currentWeek, maxAmount) as { team_id: string }[];

      let winningTeamId: string;
      if (tiedBids.length > 1) {
        winningTeamId = tiedBids[Math.floor(Math.random() * tiedBids.length)].team_id;
      } else {
        winningTeamId = tiedBids[0].team_id;
      }

      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id) as { name: string };
      const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(winningTeamId) as { name: string };
      db.prepare('INSERT INTO pole_positions (player_id, team_id, amount, week_established) VALUES (?, ?, ?, ?)').run(
        player_id, winningTeamId, maxAmount, currentWeek + 1
      );
      results.newPP.push(`${player.name} → ${team.name} ($${maxAmount})`);
    }

    // Advance week
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(currentWeek + 1), 'current_week');

    return results;
  });

  const results = advanceWeek();
  return NextResponse.json({ success: true, results, newWeek: currentWeek + 1 });
}
