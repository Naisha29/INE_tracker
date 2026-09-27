import React from 'react';
import { Package, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function StatsOverview({ trackedCount, totalScrapes, successRate, alertsCount }) {
  const stats = [
    { label: 'Tracked Products', value: trackedCount, icon: Package },
    { label: 'Total Scrapes', value: totalScrapes, icon: RefreshCw },
    { label: 'Success Rate', value: `${successRate}%`, icon: CheckCircle2 },
    { label: 'Alerts', value: alertsCount, icon: AlertTriangle }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="clean-panel p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">{stat.label}</p>
              <h3 className="text-xl font-bold text-zinc-100 mt-0.5">{stat.value}</h3>
            </div>
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
              <Icon className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
