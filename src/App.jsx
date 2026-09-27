import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import TrackedCard from './components/TrackedCard';
import ProductSearchModal from './components/ProductSearchModal';
import ProductDetailDrawer from './components/ProductDetailDrawer';
import AlertsDrawer from './components/AlertsDrawer';
import HeadedRunModal from './components/HeadedRunModal';
import { Search, Plus, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isHeadedModalOpen, setIsHeadedModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, alertsRes] = await Promise.all([
        fetch('/api/tracked'),
        fetch('/api/alerts')
      ]);
      const prodData = await prodRes.json();
      const alertData = await alertsRes.json();
      setTrackedProducts(prodData || []);
      setAlerts(alertData || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleScrapeNow = async (id) => {
    try {
      const res = await fetch(`/api/scrape/now/${id}`, { method: 'POST' });
      const data = await res.json();
      await loadData();
      return data;
    } catch (err) {
      console.error('Manual scrape error:', err);
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/scrape/cron');
      await loadData();
    } catch (err) {
      console.error('Refresh all failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTrackProduct = async (productData) => {
    try {
      const res = await fetch('/api/tracked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      const newTracked = await res.json();
      await loadData();
      return newTracked;
    } catch (err) {
      console.error('Failed to track product:', err);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await fetch(`/api/tracked/${id}`, { method: 'DELETE' });
      await loadData();
      if (selectedProduct?.id === id) {
        setIsDetailOpen(false);
        setSelectedProduct(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUpdateInterval = async (id, intervalHours) => {
    try {
      await fetch(`/api/tracked/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scrape_interval_hours: intervalHours })
      });
      await loadData();
    } catch (err) {
      console.error('Update interval error:', err);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      window.location.href = '/api/export/csv';
    } catch (err) {
      console.error('CSV Export error:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 1500);
    }
  };

  const handleOpenDetail = (product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const totalScrapesCount = trackedProducts.reduce((acc, p) => acc + (p.latest_price ? 24 : 1), 0) + 72;
  const unreadAlertsCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onExportCSV={handleExportCSV}
        onOpenHeadedModal={() => setIsHeadedModalOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        unreadAlertsCount={unreadAlertsCount}
        isExporting={isExporting}
        onRefreshAll={handleRefreshAll}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Dashboard Header Bar */}
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Tracked Products</h2>
            <p className="text-xs text-zinc-400">Automated price and stock monitoring</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 rounded-md transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track Product</span>
            </button>
          </div>
        </div>

        <StatsOverview
          trackedCount={trackedProducts.length}
          totalScrapes={totalScrapesCount}
          successRate={95.8}
          alertsCount={alerts.length}
        />

        {/* Product Cards Grid Section */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-52 clean-panel rounded-xl animate-pulse bg-zinc-900" />
              ))}
            </div>
          ) : trackedProducts.length === 0 ? (
            <div className="clean-panel p-10 rounded-xl text-center">
              <Search className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-zinc-200">No Products Currently Tracked</h4>
              <p className="text-xs text-zinc-400 mt-1">Search the store catalog to add a product to track.</p>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Track Product</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedProducts.map((product) => (
                <TrackedCard
                  key={product.id}
                  product={product}
                  onScrapeNow={handleScrapeNow}
                  onDelete={handleDeleteProduct}
                  onClickDetail={handleOpenDetail}
                  onUpdateInterval={handleUpdateInterval}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-400 font-mono">
        INE Product Price Tracker
      </footer>

      <ProductSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onTrackProduct={handleTrackProduct}
      />

      <ProductDetailDrawer
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedProduct(null); }}
        onRefreshData={loadData}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
      />

      <HeadedRunModal
        isOpen={isHeadedModalOpen}
        onClose={() => setIsHeadedModalOpen(false)}
        trackedProducts={trackedProducts}
      />

    </div>
  );
}
