import React, { useState } from 'react';
import { X, Eye, Play, Loader2, Code } from 'lucide-react';

export default function HeadedRunModal({ isOpen, onClose, trackedProducts }) {
  const [selectedProductId, setSelectedProductId] = useState(trackedProducts[0]?.product_id || '2475');
  const [optionLabel, setOptionLabel] = useState(trackedProducts[0]?.selected_option_label || '1-pack');
  const [isRunning, setIsRunning] = useState(false);
  const [logsOutput, setLogsOutput] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const handleProductSelect = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    const found = trackedProducts.find(p => p.product_id === pId);
    if (found) {
      setOptionLabel(found.selected_option_label);
    }
  };

  const handleRunHeaded = async () => {
    setIsRunning(true);
    setLogsOutput('Spawning Playwright headed browser process...\n');
    setIsCompleted(false);

    try {
      const res = await fetch('/api/scrape/headed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          option_label: optionLabel
        })
      });

      const data = await res.json();
      if (data.stdout) {
        setLogsOutput(prev => prev + '\n' + data.stdout);
      } else if (data.error) {
        setLogsOutput(prev => prev + '\n[Error] ' + data.error);
      }
      setIsCompleted(true);
    } catch (err) {
      setLogsOutput(prev => prev + '\n[Error] ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fade-in">
      <div className="clean-modal w-full max-w-2xl bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">Observable (Headed) Scraper Run</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Select Product:</label>
              <select
                value={selectedProductId}
                onChange={handleProductSelect}
                disabled={isRunning}
                className="w-full bg-zinc-950 text-zinc-100 text-xs px-3 py-2 rounded-lg border border-zinc-800 outline-none focus:border-amber-500"
              >
                {trackedProducts.map(p => (
                  <option key={p.id} value={p.product_id}>
                    [{p.product_id}] {p.product_name} ({p.selected_option_label})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Target Option Label:</label>
              <input
                type="text"
                value={optionLabel}
                onChange={(e) => setOptionLabel(e.target.value)}
                disabled={isRunning}
                className="w-full bg-zinc-950 text-zinc-100 text-xs px-3 py-2 rounded-lg border border-zinc-800 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Terminal / Output Console */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5 text-amber-400" /> Scraper Terminal Output:</span>
              <span>CLI: <code className="text-amber-300">npm run scrape:headed</code></span>
            </div>
            <div className="h-48 bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 overflow-y-auto whitespace-pre-wrap selection:bg-amber-500 selection:text-zinc-950">
              {logsOutput || '// Output will stream here when launched...'}
            </div>
          </div>

        </div>

        {/* Footer Action */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            {isCompleted ? '✓ Run complete!' : isRunning ? 'Browser running on screen...' : 'Ready to launch'}
          </span>

          <button
            onClick={handleRunHeaded}
            disabled={isRunning}
            className="px-4 py-2 text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors flex items-center gap-1.5"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-zinc-950" />}
            <span>{isRunning ? 'Running...' : 'Launch Headed Browser'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
