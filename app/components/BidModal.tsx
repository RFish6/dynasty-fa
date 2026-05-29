'use client';

import { useState } from 'react';
import { PlayerRow, BudgetInfo } from '../page';

interface Props {
  player: PlayerRow;
  teamId: string;
  teamName: string;
  currentBid?: number;
  budget?: BudgetInfo;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BidModal({ player, teamId, teamName, currentBid, budget, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState(currentBid ? String(currentBid) : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const minBid = player.pp_team_id && player.pp_team_id !== teamId
    ? player.pp_amount! + 1
    : 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/bids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, player_id: player.id, amount: parseInt(amount) }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Failed to submit bid');
    } else {
      onSuccess();
    }
  }

  async function handleRemove() {
    setLoading(true);
    await fetch('/api/bids', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, player_id: player.id }),
    });
    setLoading(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{player.name}</h2>
            <p className="text-sm text-gray-400">{player.position} · {player.contract_years}-year contract</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {player.pp_team_id && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
            <span className="text-gray-400">Pole Position: </span>
            <span className="text-white font-semibold">{player.pp_team_name}</span>
            <span className="text-green-400 font-bold ml-1">${player.pp_amount}</span>
            {player.pp_team_id === teamId && <span className="ml-2 text-xs bg-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded">That&apos;s you!</span>}
          </div>
        )}

        {budget && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-gray-400 text-xs">Budget</div>
              <div className="font-bold">${budget.budget}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Committed</div>
              <div className="font-bold text-red-400">${budget.committed}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Available</div>
              <div className={`font-bold ${budget.available < 20 ? 'text-red-400' : 'text-green-400'}`}>${budget.available}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-400 mb-1">
            Bid Amount {minBid > 1 && <span className="text-amber-400">(min ${minBid})</span>}
          </label>
          <div className="flex gap-2 mb-4">
            <span className="flex items-center px-3 bg-gray-800 border border-gray-700 rounded-l-lg text-gray-400">$</span>
            <input
              type="number"
              min={minBid}
              max={budget?.available || 9999}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-r-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder={String(minBid)}
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : currentBid ? 'Update Bid' : 'Place Bid'}
            </button>
            {currentBid && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading}
                className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </form>

        <p className="mt-3 text-xs text-gray-600 text-center">
          Bidding as <span className="text-gray-400">{teamName}</span>
        </p>
      </div>
    </div>
  );
}
