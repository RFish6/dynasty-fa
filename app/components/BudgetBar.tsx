'use client';

import { BudgetInfo } from '../page';

interface Props {
  budget: BudgetInfo;
  teamName: string;
  showBids?: boolean;
}

export default function BudgetBar({ budget, teamName, showBids = false }: Props) {
  const visibleCommitted = showBids ? budget.committed : budget.signedCost + budget.poleCost;
  const visibleAvailable = budget.budget - visibleCommitted;

  const pctSigned = Math.min(100, Math.round((budget.signedCost / budget.budget) * 100));
  const pctPole = Math.min(100, Math.round((budget.poleCost / budget.budget) * 100));
  const pctBid = showBids ? Math.min(100, Math.round((budget.bidCost / budget.budget) * 100)) : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white">{teamName}</span>
        <div className="text-sm">
          <span className={`font-bold ${visibleAvailable < 20 ? 'text-red-400' : 'text-green-400'}`}>
            ${visibleAvailable}
          </span>
          <span className="text-gray-500"> left of </span>
          <span className="text-gray-300">${budget.budget}</span>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
        <div className="bg-red-500 h-full transition-all" style={{ width: `${pctSigned}%` }} title={`Signed: $${budget.signedCost}`} />
        <div className="bg-indigo-500 h-full transition-all" style={{ width: `${pctPole}%` }} title={`Pole Position: $${budget.poleCost}`} />
        {showBids && <div className="bg-amber-500 h-full transition-all" style={{ width: `${pctBid}%` }} title={`Current Bids: $${budget.bidCost}`} />}
      </div>

      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        {budget.signedCost > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Signed ${budget.signedCost}</span>}
        {budget.poleCost > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1" />PP ${budget.poleCost}</span>}
        {showBids && budget.bidCost > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Bids ${budget.bidCost}</span>}
        {visibleCommitted === 0 && <span className="text-gray-600">No commitments</span>}
      </div>
    </div>
  );
}
