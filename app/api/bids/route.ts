import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCurrentWeek, getTeamBudgetInfo } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { team_id, player_id, amount } = await req.json();

  if (!team_id || !player_id || amount === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const bidAmount = parseInt(amount);
  if (isNaN(bidAmount) || bidAmount < 1) {
    return NextResponse.json({ error: 'Bid must be at least $1' }, { status: 400 });
  }

  const db = getDb();
  const currentWeek = getCurrentWeek();

  // Check player is available
  const player = db.prepare('SELECT * FROM players WHERE id = ? AND is_available = 1').get(player_id);
  if (!player) {
    return NextResponse.json({ error: 'Player not available' }, { status: 400 });
  }

  // Check player not already signed
  const signed = db.prepare('SELECT 1 FROM signed_players WHERE player_id = ?').get(player_id);
  if (signed) {
    return NextResponse.json({ error: 'Player already signed' }, { status: 400 });
  }

  // Bid must exceed current pole position
  const pp = db.prepare('SELECT * FROM pole_positions WHERE player_id = ?').get(player_id) as { team_id: string; amount: number } | undefined;
  if (pp && pp.team_id !== team_id && bidAmount <= pp.amount) {
    return NextResponse.json({ error: `Bid must exceed current pole position of $${pp.amount}` }, { status: 400 });
  }

  // Check existing bid this week from this team on this player
  const existingBid = db.prepare('SELECT * FROM bids WHERE team_id = ? AND player_id = ? AND week = ?').get(team_id, player_id, currentWeek) as { amount: number; id: number } | undefined;

  // Calculate budget impact
  const budgetInfo = getTeamBudgetInfo(team_id, currentWeek);

  // If they already have a bid this week, remove its cost first for recalculation
  let currentBidCost = 0;
  if (existingBid) {
    // If they don't hold PP on this player, their existing bid was counting against budget
    const holdsPP = pp && pp.team_id === team_id;
    if (!holdsPP) currentBidCost = existingBid.amount;
  }

  const holdsPP = pp && pp.team_id === team_id;
  const newCommitment = holdsPP ? 0 : bidAmount; // If they hold PP, bid replaces PP cost (already counted)
  const ppCostForThisPlayer = holdsPP ? pp.amount : 0;

  const availableAfterRemovingThisPlayer = budgetInfo.available + currentBidCost + ppCostForThisPlayer;
  if (newCommitment > availableAfterRemovingThisPlayer) {
    return NextResponse.json({
      error: `Insufficient budget. Available: $${availableAfterRemovingThisPlayer}, Bid: $${bidAmount}`
    }, { status: 400 });
  }

  // Upsert bid
  if (existingBid) {
    db.prepare("UPDATE bids SET amount = ?, created_at = datetime('now') WHERE id = ?").run(bidAmount, existingBid.id);
  } else {
    db.prepare('INSERT INTO bids (player_id, team_id, amount, week) VALUES (?, ?, ?, ?)').run(player_id, team_id, bidAmount, currentWeek);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { team_id, player_id } = await req.json();
  const db = getDb();
  const currentWeek = getCurrentWeek();

  db.prepare('DELETE FROM bids WHERE team_id = ? AND player_id = ? AND week = ?').run(team_id, player_id, currentWeek);
  return NextResponse.json({ success: true });
}
