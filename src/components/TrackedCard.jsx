import React, { useState } from 'react';
import { RefreshCw, Clock, Trash2, ChevronRight, Tag, CheckCircle2, XCircle } from 'lucide-react';

export default function TrackedCard({ product, onScrapeNow, onDelete, onClickDetail, onUpdateInterval }) {
  const [isScraping, setIsScraping] = useState(false);

  const handleManualScrape = async (e) => {
    e.stopPropagation();
    setIsScraping(true);
    try {
      await onScrapeNow(product.id);
    } finally {
      setIsScraping(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Stop tracking "${product.product_name}"?`)) {
      onDelete(product.id);
    }
  };

  const handleIntervalChange = (e) => {
    e.stopPropagation();
    onUpdateInterval(product.id, parseInt(e.target.value, 10));
  };

  const stockText = product.latest_stock || 'Unknown';
  const isOutOfStock = stockText.toLowerCase().includes('sold out') || stockText.toLowerCase().includes('out of stock');

  return (
    <div 
      onClick={() => onClickDetail(product)}
      className="clean-card rounded-xl p-5 cursor-pointer relative flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900">
            {product.category || 'Product'}
          </span>

          <div className="flex items-center gap-1.5">
            <select
              value={product.scrape_interval_hours || 2}
              onChange={handleIntervalChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 text-xs text-zinc-300 border border-zinc-700 rounded px-2 py-0.5 outline-none focus:border-cyan-500"
              title="Scrape Interval"
            >
              <option value={1}>1h</option>
              <option value={2}>2h</option>
              <option value={6}>6h</option>
              <option value={12}>12h</option>
              <option value={24}>24h</option>
            </select>

            <button
              onClick={handleDelete}
              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold text-zinc-100 hover:text-cyan-400 transition-colors line-clamp-1">
          {product.product_name}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
          <span>{product.brand}</span>
          <span>•</span>
          <span className="font-mono text-zinc-400">SKU: {product.sku}</span>
        </p>

        <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
          <Tag className="w-3 h-3 text-zinc-400" />
          <span>Option: <strong className="text-zinc-100">{product.selected_option_label}</strong></span>
        </div>
      </div>

      <div className="my-4 pt-3 border-t border-zinc-800 flex items-baseline justify-between">
        <div>
          <span className="text-[11px] text-zinc-400 block font-medium">Price</span>
          <span className="text-xl font-bold text-zinc-100 tracking-tight">
            {product.latest_price !== null && product.latest_price !== undefined 
              ? `₹${Number(product.latest_price).toLocaleString('en-IN')}` 
              : '---'}
          </span>
        </div>

        <span className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 border ${
          isOutOfStock 
            ? 'bg-rose-950/60 text-rose-400 border-rose-900' 
            : 'bg-emerald-950/60 text-emerald-400 border-emerald-900'
        }`}>
          {isOutOfStock ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{stockText}</span>
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400 pt-2.5 border-t border-zinc-800">
        <div className="flex items-center gap-1 text-zinc-400">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>
            {product.latest_scraped_at 
              ? new Date(product.latest_scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Pending'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualScrape}
            disabled={isScraping}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Scraping...' : 'Scrape'}</span>
          </button>

          <span className="text-zinc-400 font-medium flex items-center hover:text-zinc-200">
            History <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
