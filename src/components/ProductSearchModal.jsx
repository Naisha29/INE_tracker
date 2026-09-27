import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, Check, Tag, Target, ArrowRight } from 'lucide-react';

export default function ProductSearchModal({ isOpen, onClose, onTrackProduct }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [scrapeInterval, setScrapeInterval] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch search results from API with debouncing
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchCatalog, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // When a product is selected, fetch full details & options
  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}`);
      const data = await res.json();
      setProductDetails(data);
      if (data.options && data.options.length > 0) {
        setSelectedOptionId(data.options[0].id);
      }
    } catch (err) {
      console.error('Failed to load item details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrack = async () => {
    if (!selectedProduct || !selectedOptionId) return;
    setIsSubmitting(true);

    const opt = (productDetails?.options || []).find(o => o.id === selectedOptionId);

    try {
      await onTrackProduct({
        product_id: selectedProduct.id,
        selected_option_id: selectedOptionId,
        selected_option_label: opt ? opt.label : 'Default',
        scrape_interval_hours: parseInt(scrapeInterval, 10),
        target_price: targetPrice ? parseFloat(targetPrice) : null
      });

      // Reset state and close modal
      setSelectedProduct(null);
      setProductDetails(null);
      setQuery('');
      setTargetPrice('');
      onClose();
    } catch (err) {
      console.error('Error tracking product:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-modal w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              <span>Search INE Mock Store</span>
            </h2>
            <p className="text-xs text-slate-400">Search catalog by partial or full product name</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Lumeno Switch, Tundrel Lantern, Camera, Headlamp..."
              className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-cyan-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {!selectedProduct ? (
            /* Search Results List */
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Matching Products ({results.length})
              </p>

              {results.length === 0 && !isLoading ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No products found matching "{query}". Try a different product name or category.
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectProduct(item)}
                      className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="text-slate-300">{item.brand}</span>
                          <span>•</span>
                          <span className="text-cyan-400/80 font-mono">{item.category}</span>
                          <span>•</span>
                          <span className="text-slate-500 font-mono">ID: {item.id}</span>
                        </p>
                      </div>
                      <div className="flex items-center text-xs text-cyan-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Select Options</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Product & Option Configuration */
            <div className="space-y-5 animate-fade-in">
              <button
                onClick={() => { setSelectedProduct(null); setProductDetails(null); }}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                ← Back to search results
              </button>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="text-base font-bold text-white">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedProduct.description}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>Brand: {selectedProduct.brand}</span>
                  <span>Category: {selectedProduct.category}</span>
                  <span>SKU: {selectedProduct.sku}</span>
                </div>
              </div>

              {/* Variant / Option Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <span>Select Product Option / Size / Color to Track:</span>
                </label>
                
                {isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Loading available options...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(productDetails?.options || []).map((opt) => {
                      const isSelected = selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOptionId(opt.id)}
                          className={`p-2.5 text-xs font-semibold rounded-xl border transition-all text-left flex items-center justify-between ${
                            isSelected 
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/10'
                              : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scrape Settings: Target Price & Interval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>Target Price Alert (Optional ₹):</span>
                  </label>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 px-3 py-2 rounded-lg border border-slate-700 text-xs outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Scrape Schedule Frequency:
                  </label>
                  <select
                    value={scrapeInterval}
                    onChange={(e) => setScrapeInterval(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 text-xs outline-none focus:border-cyan-500"
                  >
                    <option value={1}>Every 1 hour</option>
                    <option value={2}>Every 2 hours (Default)</option>
                    <option value={6}>Every 6 hours</option>
                    <option value={12}>Every 12 hours</option>
                    <option value={24}>Daily (24 hours)</option>
                  </select>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        {selectedProduct && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <button
              onClick={() => setSelectedProduct(null)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              onClick={handleTrack}
              disabled={isSubmitting || !selectedOptionId}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Adding & Scraping...' : 'Start Tracking Product'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
