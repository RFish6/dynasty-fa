'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ onClose, onSuccess }: Props) {
  const [csv, setCsv] = useState('');
  const [replace, setReplace] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  async function handleImport() {
    setError('');
    setLoading(true);

    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length < 2) {
      setError('Need at least a header row and one player row');
      setLoading(false);
      return;
    }

    // Parse CSV (Name, Position, Contract Years)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('player'));
    const posIdx = headers.findIndex(h => h.includes('pos'));
    const yrsIdx = headers.findIndex(h => h.includes('year') || h.includes('yr') || h.includes('contract'));

    if (nameIdx === -1 || posIdx === -1 || yrsIdx === -1) {
      setError('CSV must have columns: Name/Player, Position/Pos, Contract Years/Yr. Got: ' + headers.join(', '));
      setLoading(false);
      return;
    }

    const players = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      return {
        name: cols[nameIdx],
        position: cols[posIdx],
        contract_years: cols[yrsIdx],
      };
    }).filter(p => p.name);

    const res = await fetch('/api/import-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players, replace }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Import failed');
    } else {
      setImported(data.imported);
      setTimeout(() => onSuccess(), 1500);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Import Players</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          Paste CSV data from your Google Sheet. Expected columns: <code className="text-indigo-300">Name, Position, Contract Years</code>
        </p>

        <p className="text-xs text-gray-500 mb-3">
          In Google Sheets: File → Download → CSV, then paste the contents below. Or copy the FA tab cells directly.
        </p>

        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          placeholder={`Name,Position,Contract Years\nCeeDee Lamb,WR,3\nBreece Hall,RB,2`}
          className="w-full h-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 resize-none"
        />

        <label className="flex items-center gap-2 mt-3 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={replace}
            onChange={e => setReplace(e.target.checked)}
            className="rounded"
          />
          Replace existing players (uncheck to append)
        </label>

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        {imported !== null && <p className="text-green-400 text-sm mt-2">✓ Imported {imported} players!</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleImport}
            disabled={loading || !csv.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
          <button onClick={onClose} className="px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  );
}
