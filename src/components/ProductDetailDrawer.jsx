import React, { useState, useEffect } from 'react';
import { 
  X, 
  LineChart as LineChartIcon, 
  Table, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Calendar,
  Clock,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

export default function ProductDetailDrawer({ product, isOpen, onClose, onRefreshData }) {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'logs'
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [histRes, logsRes] = await Promise.all([
          fetch(`/api/history/${product.id}`),
          fetch(`/api/logs/${product.id}`)
        ]);
        const histData = await histRes.json();
        const logsData = await logsRes.json();
        setHistory(histData);
        setLogs(logsData);
      } catch (err) {
        console.error('Failed to load product history & logs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Format data for Recharts
  const chartData = history
    .filter(h => h.price !== null)
    .map(h => ({
      timestamp: new Date(h.scraped_at).toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      price: Number(h.price),
      stock: h.stock_status,
      outcome: h.outcome
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-modal w-full max-w-4xl h-full border-l border-slate-800 shadow-2xl flex flex-col">
        
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                {product.category || 'Product'}
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {product.product_id}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{product.product_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Brand: {product.brand}</span>
              <span>•</span>
              <span className="text-cyan-300 font-semibold">Option: {product.selected_option_label}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-900/60 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('chart')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'chart' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChartIcon className="w-4 h-4" />
            <span>Price & Stock History Chart</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'logs' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Per-Product Scrape Log ({logs.length})</span>
          </button>
        </div>

        {/* Drawer Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {activeTab === 'chart' ? (
            /* Interactive Recharts Price History */
            <div className="space-y-6">
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Price History Over Time (₹)</h3>
                    <p className="text-xs text-slate-400">Scraped prices tracked across unattended schedule runs</p>
                  </div>
                  {chartData.length > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Latest Scraped</span>
                      <span className="text-lg font-bold text-cyan-300">₹{chartData[chartData.length - 1].price.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                    No historical price data recorded yet.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                          formatter={(value, name, props) => [`₹${value.toLocaleString('en-IN')}`, 'Price']}
                          labelFormatter={(label) => `Time: ${label}`}
                        />
                        {product.target_price && (
                          <ReferenceLine y={Number(product.target_price)} label={`Target ₹${product.target_price}`} stroke="#f59e0b" strokeDasharray="4 4" />
                        )}
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#38bdf8" 
                          strokeWidth={3}
                          dot={{ fill: '#38bdf8', r: 4 }}
                          activeDot={{ r: 6, fill: '#818cf8', stroke: '#ffffff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

          ) : (

            /* Per-Product Scrape Logs Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Scrape Log History</h3>
                  <p className="text-xs text-slate-400">Honest record of every scrape attempt and its outcome</p>
                </div>
              </div>

              <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Timestamp (UTC)</th>
                        <th className="py-3 px-4">Attempt #</th>
                        <th className="py-3 px-4">Outcome</th>
                        <th className="py-3 px-4">Price Extracted</th>
                        <th className="py-3 px-4">Stock Status</th>
                        <th className="py-3 px-4">Latency</th>
                        <th className="py-3 px-4">Details / Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No scrape attempts recorded yet.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const isSuccess = log.outcome === 'success';
                          const isRetried = log.outcome === 'retried';
                          const isFailed = log.outcome === 'failed';

                          return (
                            <tr key={log.id} className="hover:bg-slate-800/40 transition-colors font-mono">
                              <td className="py-3 px-4 text-slate-300">
                                {new Date(log.scraped_at).toISOString().replace('T', ' ').substring(0, 19)} UTC
                              </td>

                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300">
                                  Attempt #{log.attempt_number}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold ${
                                  isSuccess 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : isRetried
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                                  {isRetried && <RefreshCw className="w-3 h-3 animate-spin" />}
                                  {isFailed && <XCircle className="w-3 h-3" />}
                                  <span className="capitalize">{log.outcome}</span>
                                </span>
                              </td>

                              <td className="py-3 px-4 font-bold text-white">
                                {log.price !== null && log.price !== undefined ? `₹${Number(log.price).toLocaleString('en-IN')}` : '---'}
                              </td>

                              <td className="py-3 px-4 text-slate-300">
                                {log.stock || '---'}
                              </td>

                              <td className="py-3 px-4 text-slate-400">
                                {log.execution_time_ms ? `${log.execution_time_ms}ms` : '---'}
                              </td>

                              <td className="py-3 px-4 text-slate-400">
                                {log.error_message ? (
                                  <span className="text-rose-400 line-clamp-1">{log.error_message}</span>
                                ) : log.change_detected ? (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> DOM Shift
                                  </span>
                                ) : (
                                  <span className="text-slate-600">Clean execution</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          )}

        </div>

      </div>
    </div>
  );
}
