'use client';

import { useState } from 'react';
import { AppState } from '../page';

interface Props {
  state: AppState;
  onRefresh: () => void;
}

export default function AdminPanel({ state, onRefresh }: Props) {
  const [advanceResult, setAdvanceResult] = useState<null | { signed: string[]; newPP: string[]; updatedPP: string[] }>(null);
  const [loading, setLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetMode, setResetMode] = useState<'test' | 'live'>('live');

  async function handleAdvance() {
    if (!confirm(`Advance from Week ${state.currentWeek} to Week ${state.currentWeek + 1}?\n\nThis will sign any players whose pole position goes unchallenged.`)) return;
    setLoading(true);
    const res = await fetch('/api/advance-week', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setAdvanceResult(data.results);
      onRefresh();
    }
  }

  async function handleReset() {
    const confirmed = confirm(`RESET ALL DATA?\n\nThis will clear all bids, pole positions, and signed players, and reset to Week 1 in ${resetMode.toUpperCase()} mode.\n\nThis cannot be undone.`);
    if (!confirmed) return;
    setLoading(true);
    await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, mode: resetMode }),
    });
    setLoading(false);
    setResetConfirm(false);
    setAdvanceResult(null);
    onRefresh();
  }

  const ppPlayers = state.players.filter(p => p.pp_team_id);
  const bidsThisWeek = state.bids.length;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Admin Panel</h2>

      {/* Week status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-3">Week {state.currentWeek} Status</h3>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-indigo-400">{bidsThisWeek}</div>
            <div className="text-xs text-gray-400 mt-1">Bids this week</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-400">{ppPlayers.length}</div>
            <div className="text-xs text-gray-400 mt-1">Pole Positions</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-400">{state.signedPlayers.length}</div>
            <div className="text-xs text-gray-400 mt-1">Players Signed</div>
          </div>
        </div>

        {ppPlayers.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Players at risk of being signed (PP unchallenged → signed):</p>
            <div className="space-y-1">
              {ppPlayers.map(p => {
                const hasBidThisWeek = state.bids.some(b => b.player_id === p.id && b.amount > p.pp_amount!);
                return (
                  <div key={p.id} className={`flex justify-between text-sm px-3 py-1.5 rounded ${hasBidThisWeek ? 'bg-gray-800' : 'bg-amber-950/40 border border-amber-900/50'}`}>
                    <span>{p.name} <span className="text-gray-500">({p.position})</span></span>
                    <span>
                      {p.pp_team_name} <span className="text-green-400">${p.pp_amount}</span>
                      {!hasBidThisWeek && <span className="ml-2 text-amber-400 text-xs">→ SIGNS</span>}
                      {hasBidThisWeek && <span className="ml-2 text-blue-400 text-xs">contested</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={handleAdvance}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Processing...' : `Advance to Week ${state.currentWeek + 1}`}
        </button>
      </div>

      {/* Advance result */}
      {advanceResult && (
        <div className="bg-gray-900 border border-green-900 rounded-xl p-5">
          <h3 className="font-semibold text-green-400 mb-3">Week Advanced</h3>
          {advanceResult.signed.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1 uppercase font-semibold">Signed</p>
              {advanceResult.signed.map((s, i) => <p key={i} className="text-sm text-green-300">✓ {s}</p>)}
            </div>
          )}
          {advanceResult.newPP.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1 uppercase font-semibold">New Pole Positions</p>
              {advanceResult.newPP.map((s, i) => <p key={i} className="text-sm text-indigo-300">→ {s}</p>)}
            </div>
          )}
          {advanceResult.updatedPP.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1 uppercase font-semibold">Updated Pole Positions</p>
              {advanceResult.updatedPP.map((s, i) => <p key={i} className="text-sm text-amber-300">↑ {s}</p>)}
            </div>
          )}
          {advanceResult.signed.length === 0 && advanceResult.newPP.length === 0 && advanceResult.updatedPP.length === 0 && (
            <p className="text-sm text-gray-500">No activity this week.</p>
          )}
        </div>
      )}

      {/* Reset */}
      <div className="bg-gray-900 border border-red-900/50 rounded-xl p-5">
        <h3 className="font-semibold text-red-400 mb-2">Reset / New Season</h3>
        <p className="text-sm text-gray-400 mb-4">
          Clears all bids, pole positions, and signed players. Resets to Week 1.
          Use this to switch from test mode to live mode on 6/1.
        </p>
        <div className="flex gap-3 items-center mb-3">
          <label className="text-sm text-gray-400">Reset to mode:</label>
          <select
            value={resetMode}
            onChange={e => setResetMode(e.target.value as 'test' | 'live')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="test">Test Mode</option>
            <option value="live">Live Mode</option>
          </select>
        </div>
        <button
          onClick={() => setResetConfirm(true)}
          className="bg-red-900 hover:bg-red-800 text-red-200 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Reset All Data
        </button>
        {resetConfirm && (
          <div className="mt-3 p-3 bg-red-950 border border-red-800 rounded-lg">
            <p className="text-red-300 text-sm mb-2">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleReset} className="bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-1.5 rounded-lg">Yes, Reset</button>
              <button onClick={() => setResetConfirm(false)} className="bg-gray-700 text-gray-300 text-sm px-4 py-1.5 rounded-lg">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Passwords */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-3">Team Passwords</h3>
        <div className="rounded-lg border border-gray-800 overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-2">Team</th>
                <th className="text-left px-4 py-2">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {state.passwords.map(p => (
                <tr key={p.team_id}>
                  <td className="px-4 py-2 text-gray-200">{p.team_name}</td>
                  <td className="px-4 py-2 font-mono text-indigo-300">{p.password}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-700">
                <td className="px-4 py-2 text-amber-400 font-semibold">Admin</td>
                <td className="px-4 py-2 font-mono text-amber-300">{state.adminPassword}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-2">App Info</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Mode: <span className={state.mode === 'test' ? 'text-amber-400' : 'text-green-400'}>{state.mode === 'test' ? 'TEST' : 'LIVE'}</span></p>
          <p>Current Week: <span className="text-white">{state.currentWeek}</span></p>
          <p>Total Players: <span className="text-white">{state.players.length}</span></p>
          <p>Available: <span className="text-white">{state.players.filter(p => !p.signed_team_id).length}</span></p>
          <p>Signed: <span className="text-white">{state.signedPlayers.length}</span></p>
        </div>
      </div>
    </div>
  );
}
