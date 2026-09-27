import React from 'react';
import { Activity, Search, Download, Eye, Bell, RefreshCw } from 'lucide-react';

export default function Navbar({ 
  onOpenSearch, 
  onExportCSV, 
  onOpenHeadedModal, 
  onOpenAlerts, 
  unreadAlertsCount,
  isExporting,
  onRefreshAll,
  isRefreshing
}) {
  return (
    <header className="w-full bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-zinc-100 tracking-tight">
            INE Price Tracker
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">

          {/* Trigger All Scrapes */}
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
            title="Run Scrapes Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Scraping...' : 'Run All'}</span>
          </button>

          {/* Headed Run Button */}
          <button
            onClick={onOpenHeadedModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors"
            title="Launch Headed Browser"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Headed Mode</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={onExportCSV}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenAlerts}
            className="relative p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors"
            title="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Add Product Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Product</span>
          </button>

        </div>

      </div>
    </header>
  );
}
