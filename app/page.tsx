'use client';

import { useEffect, useState, useCallback } from 'react';
import BidModal from './components/BidModal';
import BudgetBar from './components/BudgetBar';
import AdminPanel from './components/AdminPanel';
import ImportModal from './components/ImportModal';
import LoginScreen from './components/LoginScreen';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-100 text-red-800',
  RB: 'bg-green-100 text-green-800',
  WR: 'bg-blue-100 text-blue-800',
  TE: 'bg-yellow-100 text-yellow-800',
};

export interface AppState {
  currentWeek: number;
  mode: string;
  teams: { id: string; name: string; budget: number }[];
  players: PlayerRow[];
  bids: BidRow[];
  signedPlayers: SignedRow[];
  budgets: BudgetInfo[];
  passwords: { team_id: string; team_name: string; password: string }[];
  adminPassword: string;
}

export interface PlayerRow {
  id: number;
  name: string;
  position: string;
  contract_years: number;
  is_available: number;
  pp_team_id: string | null;
  pp_amount: number | null;
  pp_week: number | null;
  pp_team_name: string | null;
  signed_team_id: string | null;
  signed_amount: number | null;
  signed_team_name: string | null;
}

export interface BidRow {
  id: number;
  player_id: number;
  team_id: string;
  team_name: string;
  amount: number;
  week: number;
}

export interface SignedRow {
  id: number;
  player_id: number;
  player_name: string;
  position: string;
  contract_years: number;
  team_id: string;
  team_name: string;
  amount: number;
  week_signed: number;
}

export interface BudgetInfo {
  team_id: string;
  budget: number;
  committed: number;
  available: number;
  signedCost: number;
  poleCost: number;
  bidCost: number;
}

type Tab = 'fa' | 'signed' | 'budgets' | 'admin';
type PosFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE';

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [role, setRole] = useState<'team' | 'admin' | null>(null);
  const [bidModal, setBidModal] = useState<PlayerRow | null>(null);
  const [tab, setTab] = useState<Tab>('fa');
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL');
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/import-players').then(() => refresh());
  }, [refresh]);

  // Restore session from localStorage
  useEffect(() => {
    const savedTeam = localStorage.getItem('fa_team');
    const savedRole = localStorage.getItem('fa_role') as 'team' | 'admin' | null;
    if (savedTeam && savedRole) {
      setSelectedTeam(savedTeam);
      setRole(savedRole);
    }
  }, []);

  function handleLogin(teamId: string, loginRole: 'team' | 'admin') {
    setSelectedTeam(teamId);
    setRole(loginRole);
    localStorage.setItem('fa_team', teamId);
    localStorage.setItem('fa_role', loginRole);
  }

  function handleLogout() {
    setSelectedTeam('');
    setRole(null);
    localStorage.removeItem('fa_team');
    localStorage.removeItem('fa_role');
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-xl">Loading Dynasty FA...</div>
    </div>
  );

  if (error || !state) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-red-400">
      <div>{error || 'Unknown error'}</div>
    </div>
  );

  if (!role) {
    return <LoginScreen teams={state.teams} onLogin={handleLogin} />;
  }

  const isAdmin = role === 'admin';
  const myBudget = state.budgets.find(b => b.team_id === selectedTeam);
  const availablePlayers = state.players.filter(p => !p.signed_team_id);
  const filteredPlayers = availablePlayers.filter(p =>
    posFilter === 'ALL' || p.position === posFilter
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">🏈 Dynasty FA</h1>
            <span className="text-sm bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
              Week {state.currentWeek}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${state.mode === 'test' ? 'bg-amber-900 text-amber-300' : 'bg-green-900 text-green-300'}`}>
              {state.mode === 'test' ? 'TEST MODE' : 'LIVE'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <span className="text-sm font-semibold text-amber-400">Admin</span>
            ) : (
              <>
                <span className="text-sm font-semibold text-white">
                  {state.teams.find(t => t.id === selectedTeam)?.name}
                </span>
                {myBudget && (
                  <div className="text-sm">
                    <span className="text-gray-400">Budget: </span>
                    <span className={`font-bold ${myBudget.available < 20 ? 'text-red-400' : 'text-green-400'}`}>
                      ${myBudget.available}
                    </span>
                    <span className="text-gray-500"> / ${myBudget.budget}</span>
                  </div>
                )}
              </>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-2">
          {(['fa', 'signed', 'budgets', ...(isAdmin ? ['admin'] : [])] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t === 'fa' ? 'Free Agency' : t === 'signed' ? 'Signed' : t === 'budgets' ? 'Budgets' : 'Admin'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* FA Tab */}
        {tab === 'fa' && (
          <div>


            {/* Position filter */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              {(['ALL', 'QB', 'RB', 'WR', 'TE'] as PosFilter[]).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPosFilter(pos)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    posFilter === pos
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {pos}
                </button>
              ))}
              <span className="ml-auto text-sm text-gray-500">{filteredPlayers.length} players</span>
            </div>

            {/* Player table */}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-left px-4 py-3">Pos</th>
                    <th className="text-left px-4 py-3">Yrs</th>
                    <th className="text-left px-4 py-3">Pole Position</th>
                    <th className="text-left px-4 py-3">This Week&apos;s Bids</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredPlayers.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No players available</td></tr>
                  )}
                  {filteredPlayers.map(player => {
                    const allWeekBids = state.bids
                      .filter(b => b.player_id === player.id)
                      .sort((a, b) => b.amount - a.amount);
                    const myBid = allWeekBids.find(b => b.team_id === selectedTeam);
                    // Non-admins only see their own bid; admin sees all
                    const visibleBids = isAdmin ? allWeekBids : (myBid ? [myBid] : []);
                    const iAmPP = player.pp_team_id === selectedTeam;

                    return (
                      <tr key={player.id} className={`hover:bg-gray-900/50 ${iAmPP ? 'bg-indigo-950/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-white">{player.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${POSITION_COLORS[player.position] || 'bg-gray-700 text-gray-300'}`}>
                            {player.position}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{player.contract_years}yr</td>
                        <td className="px-4 py-3">
                          {player.pp_team_id ? (
                            <span className={`text-sm ${iAmPP ? 'text-indigo-300 font-semibold' : 'text-gray-300'}`}>
                              {player.pp_team_name} <span className="text-green-400 font-bold">${player.pp_amount}</span>
                              {iAmPP && <span className="ml-1 text-xs bg-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded">YOU</span>}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {visibleBids.map(bid => (
                              <span
                                key={bid.id}
                                className={`text-xs px-2 py-0.5 rounded ${
                                  bid.team_id === selectedTeam
                                    ? 'bg-indigo-800 text-indigo-200'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {bid.team_name}: ${bid.amount}
                              </span>
                            ))}
                            {visibleBids.length === 0 && <span className="text-gray-600 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {!isAdmin && (
                            <button
                              onClick={() => setBidModal(player)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                myBid
                                  ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                              }`}
                            >
                              {myBid ? `Edit ($${myBid.amount})` : 'Bid'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => setImportOpen(true)}
                className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Import players from CSV / Google Sheet
              </button>
            )}
          </div>
        )}

        {/* Signed Tab */}
        {tab === 'signed' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Signed Players</h2>
            {state.signedPlayers.length === 0 ? (
              <div className="text-gray-500 text-center py-12">No players signed yet</div>
            ) : (
              <div className="rounded-xl border border-gray-800 overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 text-xs uppercase">
                      <th className="text-left px-4 py-3">Player</th>
                      <th className="text-left px-4 py-3">Pos</th>
                      <th className="text-left px-4 py-3">Yrs</th>
                      <th className="text-left px-4 py-3">Team</th>
                      <th className="text-left px-4 py-3">Amount</th>
                      <th className="text-left px-4 py-3">Week</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {state.signedPlayers.map(sp => (
                      <tr key={sp.id} className="hover:bg-gray-900/50">
                        <td className="px-4 py-3 font-medium text-white">{sp.player_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${POSITION_COLORS[sp.position] || ''}`}>
                            {sp.position}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{sp.contract_years}yr</td>
                        <td className="px-4 py-3 text-gray-200">{sp.team_name}</td>
                        <td className="px-4 py-3 text-green-400 font-bold">${sp.amount}</td>
                        <td className="px-4 py-3 text-gray-400">Week {sp.week_signed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Budgets Tab */}
        {tab === 'budgets' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Team Budgets</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {state.budgets
                .sort((a, b) => b.available - a.available)
                .map(b => (
                  <BudgetBar key={b.team_id} budget={b} teamName={state.teams.find(t => t.id === b.team_id)?.name || b.team_id} showBids={isAdmin || b.team_id === selectedTeam} />
                ))}
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {tab === 'admin' && (
          <AdminPanel state={state} onRefresh={refresh} />
        )}
      </div>

      {/* Bid Modal */}
      {bidModal && selectedTeam && (
        <BidModal
          player={bidModal}
          teamId={selectedTeam}
          teamName={state.teams.find(t => t.id === selectedTeam)?.name || selectedTeam}
          currentBid={state.bids.find(b => b.player_id === bidModal.id && b.team_id === selectedTeam)?.amount}
          budget={myBudget}
          onClose={() => setBidModal(null)}
          onSuccess={() => { setBidModal(null); refresh(); }}
        />
      )}

      {/* Import Modal */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onSuccess={() => { setImportOpen(false); refresh(); }}
        />
      )}
    </div>
  );
}
