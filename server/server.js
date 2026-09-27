const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const DB = require('./db');
const { scrapeProduct } = require('./scraper');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const STORE_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

app.use(cors());
app.use(express.json());

// Serve static frontend in production if built
app.use(express.static(path.join(__dirname, '../dist')));

// 1. Search & Catalog Proxy
app.get('/api/products/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);

    const response = await axios.get(`${STORE_BASE_URL}/api/v2/listings?page=${page}&limit=${limit}`);
    const catalog = response.data;

    if (!query) {
      return res.json(catalog);
    }

    const filtered = catalog.results.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.brand.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      String(item.id) === query
    );

    res.json({
      page: 1,
      perPage: filtered.length,
      totalPages: 1,
      count: filtered.length,
      results: filtered
    });

  } catch (err) {
    console.error('[API Error] Search failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch catalog from INE mock store' });
  }
});

// 2. Product Details Proxy
app.get('/api/products/:id', async (req, res) => {
  try {
    const response = await axios.get(`${STORE_BASE_URL}/api/v2/items/${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    console.error(`[API Error] Item details failed for ${req.params.id}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// 3. Tracked Products List
app.get('/api/tracked', async (req, res) => {
  try {
    const products = await DB.getTrackedProducts();
    // Enrich with latest price & stock
    const enriched = await Promise.all(products.map(async (p) => {
      const history = await DB.getPriceHistory(p.id);
      const latest = history.length > 0 ? history[history.length - 1] : null;
      return {
        ...p,
        latest_price: latest ? latest.price : null,
        latest_stock: latest ? latest.stock_status : null,
        latest_scraped_at: latest ? latest.scraped_at : p.last_scraped_at
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Add Tracked Product
app.post('/api/tracked', async (req, res) => {
  try {
    const { product_id, selected_option_id, selected_option_label, scrape_interval_hours, target_price } = req.body;
    if (!product_id || !selected_option_id) {
      return res.status(400).json({ error: 'product_id and selected_option_id are required' });
    }

    const itemRes = await axios.get(`${STORE_BASE_URL}/api/v2/items/${product_id}`);
    const item = itemRes.data;

    const optObj = (item.options || []).find(o => o.id === selected_option_id) || { label: selected_option_label || 'Default' };

    const tracked = await DB.addTrackedProduct({
      product_id: String(item.id),
      product_name: item.name,
      product_slug: item.slug,
      brand: item.brand,
      category: item.category,
      sku: item.sku,
      selected_option_id: selected_option_id,
      selected_option_label: optObj.label,
      scrape_interval_hours: scrape_interval_hours || 2,
      target_price: target_price || null
    });

    // Trigger initial scrape asynchronously
    scrapeProduct(tracked, false).catch(err => console.error('[Initial Scrape Error]', err));

    res.status(201).json(tracked);
  } catch (err) {
    console.error('[API Error] Add tracked product failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. Update Tracked Product
app.patch('/api/tracked/:id', async (req, res) => {
  try {
    const updated = await DB.updateTrackedProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete Tracked Product
app.delete('/api/tracked/:id', async (req, res) => {
  try {
    await DB.deleteTrackedProduct(req.params.id);
    res.json({ success: true, message: 'Tracked product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. On-demand Scrape trigger
app.post('/api/scrape/now/:id', async (req, res) => {
  try {
    const tracked = await DB.getTrackedProductById(req.params.id);
    if (!tracked) {
      return res.status(404).json({ error: 'Tracked product not found' });
    }

    const scrapeResult = await scrapeProduct(tracked, false);
    res.json({ success: true, result: scrapeResult });
  } catch (err) {
    console.error('[API Error] Manual scrape failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 8. External Cron Trigger (cron-job.org / Render Cron / GitHub Actions)
app.get('/api/scrape/cron', async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET || 'secret-cron-key-123';
    if (req.query.key && req.query.key !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized cron key' });
    }

    console.log('\n[Cron Job] Triggered scheduled scrape task...');
    const trackedProducts = await DB.getTrackedProducts();
    const results = [];

    for (const prod of trackedProducts) {
      if (prod.is_active) {
        console.log(`[Cron Job] Processing product ${prod.product_name}...`);
        const result = await scrapeProduct(prod, false);
        results.push({ product_id: prod.product_id, name: prod.product_name, result });
      }
    }

    res.json({
      success: true,
      message: `Scraped ${results.length} active products`,
      scraped_count: results.length,
      results
    });

  } catch (err) {
    console.error('[Cron Error] Execution failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 9. Price History Endpoint
app.get('/api/history/:id', async (req, res) => {
  try {
    const history = await DB.getPriceHistory(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Scrape Logs Endpoint
app.get('/api/logs/:id', async (req, res) => {
  try {
    const logs = await DB.getScrapeLogs(req.params.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. CSV Export Endpoint (Spec Requirement)
app.get('/api/export/csv', async (req, res) => {
  try {
    const logs = await DB.getAllScrapeLogs();
    
    // Header line as required by spec:
    // Store Product ID, Product Name, Selected Option, Timestamp (ISO 8601, UTC), Price, Stock, Outcome
    let csvContent = 'Store Product ID,Product Name,Selected Option,Timestamp (ISO 8601 UTC),Price,Stock,Outcome\n';

    logs.forEach(log => {
      const storeId = `"${(log.product_id || '').replace(/"/g, '""')}"`;
      const name = `"${(log.product_name || '').replace(/"/g, '""')}"`;
      const option = `"${(log.selected_option_label || '').replace(/"/g, '""')}"`;
      const timestamp = `"${log.scraped_at || ''}"`;
      const price = log.price !== null && log.price !== undefined ? log.price : '';
      const stock = `"${(log.stock || '').replace(/"/g, '""')}"`;
      const outcome = `"${log.outcome || ''}"`;

      csvContent += `${storeId},${name},${option},${timestamp},${price},${stock},${outcome}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=ine_scrape_history_${Date.now()}.csv`);
    res.status(200).send(csvContent);

  } catch (err) {
    console.error('[Export Error] Failed to generate CSV:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 12. Alerts Endpoint
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await DB.getAlerts();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Trigger Headed Browser Run Process
app.post('/api/scrape/headed', (req, res) => {
  const { product_id = '2475', option_label = '1-pack' } = req.body;
  const scriptPath = path.join(__dirname, 'headed_run.js');

  console.log(`[Headed API] Spawning headed scraper for ${product_id} (${option_label})...`);
  exec(`node "${scriptPath}" "${product_id}" "${option_label}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('[Headed Error]', error.message);
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ success: true, stdout });
  });
});

// Fallback route for SPA in production
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'), err => {
    if (err) {
      res.send('INE Product Price Tracker API Server is running.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
  console.log(`📊 Store Target: ${STORE_BASE_URL}`);
});
