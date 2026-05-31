'use client';

import { useEffect, useState } from 'react';
import { PlayerRow } from '../page';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-100 text-red-800',
  RB: 'bg-green-100 text-green-800',
  WR: 'bg-blue-100 text-blue-800',
  TE: 'bg-yellow-100 text-yellow-800',
};

interface BidHistoryRow {
  id: number;
  player_id: number;
  team_id: string;
  team_name: string;
  amount: number;
  week: number;
}

interface Props {
  player: PlayerRow;
  selectedTeam: string;
  onClose: () => void;
}

export default function PlayerHistoryModal({ player, selectedTeam, onClose }: Props) {
  const [bids, setBids] = useState<BidHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${player.id}/history`)
      .then(r => r.json())
      .then(d => { setBids(d.bids); setLoading(false); });
  }, [player.id]);

  // Everyone sees the full bid history across all teams
  const visibleBids = bids;

  // Group by week
  const weeks = [...new Set(visibleBids.map(b => b.week))].sort((a, b) => b - a);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${POSITION_COLORS[player.position] || 'bg-gray-700 text-gray-300'}`}>
                {player.position}
              </span>
              <span className="text-xs text-gray-500">{player.contract_years}yr contract</span>
            </div>
            <h2 className="text-xl font-bold text-white">{player.name}</h2>
            {player.signed_team_name && (
              <p className="text-sm text-green-400 mt-1">✓ Signed by {player.signed_team_name} — ${player.signed_amount}</p>
            )}
            {player.pp_team_name && !player.signed_team_name && (
              <p className="text-sm text-indigo-300 mt-1">🏆 Pole Position: {player.pp_team_name} — ${player.pp_amount}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none mt-1">×</button>
        </div>

        {/* Bid History */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Bid History</h3>

          {loading && <p className="text-gray-500 text-sm">Loading...</p>}

          {!loading && visibleBids.length === 0 && (
            <p className="text-gray-500 text-sm">No bids placed yet.</p>
          )}

          {!loading && weeks.map(week => {
            const weekBids = visibleBids.filter(b => b.week === week);
            return (
              <div key={week} className="mb-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Week {week}</p>
                <div className="space-y-1">
                  {weekBids.map(bid => (
                    <div key={bid.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bid.team_id === selectedTeam ? 'bg-indigo-950/50 border border-indigo-800/50' : 'bg-gray-800'}`}>
                      <span className={`text-sm ${bid.team_id === selectedTeam ? 'text-indigo-200 font-semibold' : 'text-gray-300'}`}>
                        {bid.team_name}{bid.team_id === selectedTeam && ' (you)'}
                      </span>
                      <span className="font-bold text-white">${bid.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
