import React from 'react';
import { X, Bell, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';

export default function AlertsDrawer({ isOpen, onClose, alerts }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-modal w-full max-w-md h-full border-l border-slate-800 shadow-2xl flex flex-col">
        
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Price & System Alerts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
              No active price or stock alerts right now.
            </div>
          ) : (
            alerts.map((alert) => {
              const isPriceDrop = alert.alert_type === 'price_drop';
              const isStructureChange = alert.alert_type === 'structure_change';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isPriceDrop
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isStructureChange
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isPriceDrop ? (
                      <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">{alert.product_name}</h4>
                      <p className="text-xs mt-1 leading-relaxed">{alert.message}</p>
                      <span className="text-[10px] text-slate-400 block mt-2 font-mono">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
