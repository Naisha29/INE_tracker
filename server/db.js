const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let useLocalFallback = false;

if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-supabase')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DB] Connected to Supabase PostgreSQL database.');
  } catch (err) {
    console.warn('[DB] Supabase initialization failed, using local storage fallback.', err.message);
    useLocalFallback = true;
  }
} else {
  console.log('[DB] No valid SUPABASE_URL provided. Operating in local JSON storage mode.');
  useLocalFallback = true;
}

// Local JSON Storage file path
const STORAGE_FILE = path.join(__dirname, 'local_db.json');

function loadLocalDB() {
  if (!fs.existsSync(STORAGE_FILE)) {
    const initial = {
      tracked_products: [],
      price_history: [],
      scrape_logs: [],
      price_alerts: []
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { tracked_products: [], price_history: [], scrape_logs: [], price_alerts: [] };
  }
}

function saveLocalDB(data) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}

// Data Access API
const DB = {
  async getTrackedProducts() {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('tracked_products').select('*').order('created_at', { ascending: false });
      if (!error) return data;
      console.error('[DB Error] Supabase fetch error:', error);
    }
    const db = loadLocalDB();
    return db.tracked_products;
  },

  async getTrackedProductById(id) {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('tracked_products').select('*').eq('id', id).single();
      if (!error) return data;
    }
    const db = loadLocalDB();
    return db.tracked_products.find(p => p.id === id) || null;
  },

  async addTrackedProduct(product) {
    const newProduct = {
      id: product.id || require('crypto').randomUUID(),
      product_id: String(product.product_id),
      product_name: product.product_name,
      product_slug: product.product_slug || '',
      brand: product.brand || '',
      category: product.category || '',
      sku: product.sku || '',
      selected_option_id: product.selected_option_id,
      selected_option_label: product.selected_option_label,
      scrape_interval_hours: product.scrape_interval_hours || 2,
      target_price: product.target_price ? Number(product.target_price) : null,
      is_active: true,
      last_scraped_at: null,
      created_at: new Date().toISOString()
    };

    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('tracked_products').insert([newProduct]).select().single();
      if (!error) return data;
      console.error('[DB Error] Failed to add tracked product to Supabase:', error);
    }

    const db = loadLocalDB();
    // Prevent duplicates for same product + option
    const existing = db.tracked_products.find(p => p.product_id === newProduct.product_id && p.selected_option_id === newProduct.selected_option_id);
    if (existing) return existing;

    db.tracked_products.unshift(newProduct);
    saveLocalDB(db);
    return newProduct;
  },

  async updateTrackedProduct(id, updates) {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('tracked_products').update(updates).eq('id', id).select().single();
      if (!error) return data;
    }
    const db = loadLocalDB();
    const idx = db.tracked_products.findIndex(p => p.id === id);
    if (idx !== -1) {
      db.tracked_products[idx] = { ...db.tracked_products[idx], ...updates };
      saveLocalDB(db);
      return db.tracked_products[idx];
    }
    return null;
  },

  async deleteTrackedProduct(id) {
    if (!useLocalFallback && supabase) {
      await supabase.from('tracked_products').delete().eq('id', id);
    }
    const db = loadLocalDB();
    db.tracked_products = db.tracked_products.filter(p => p.id !== id);
    db.price_history = db.price_history.filter(h => h.tracked_product_id !== id);
    db.scrape_logs = db.scrape_logs.filter(l => l.tracked_product_id !== id);
    saveLocalDB(db);
    return true;
  },

  async addPriceHistoryRecord(record) {
    const newRecord = {
      id: record.id || require('crypto').randomUUID(),
      tracked_product_id: record.tracked_product_id,
      product_id: String(record.product_id),
      product_name: record.product_name,
      selected_option_label: record.selected_option_label,
      price: record.price !== null && record.price !== undefined ? Number(record.price) : null,
      currency: record.currency || '₹',
      stock_status: record.stock_status || null,
      stock_count: record.stock_count !== undefined ? record.stock_count : null,
      scraped_at: record.scraped_at || new Date().toISOString(),
      outcome: record.outcome
    };

    if (!useLocalFallback && supabase) {
      await supabase.from('price_history').insert([newRecord]);
    }

    const db = loadLocalDB();
    db.price_history.push(newRecord);
    saveLocalDB(db);
    return newRecord;
  },

  async addScrapeLogRecord(log) {
    const newLog = {
      id: log.id || require('crypto').randomUUID(),
      tracked_product_id: log.tracked_product_id,
      product_id: String(log.product_id),
      product_name: log.product_name,
      selected_option_label: log.selected_option_label,
      scraped_at: log.scraped_at || new Date().toISOString(),
      attempt_number: log.attempt_number || 1,
      outcome: log.outcome,
      price: log.price !== null && log.price !== undefined ? Number(log.price) : null,
      stock: log.stock || null,
      execution_time_ms: log.execution_time_ms || 0,
      error_message: log.error_message || null,
      change_detected: Boolean(log.change_detected)
    };

    if (!useLocalFallback && supabase) {
      await supabase.from('scrape_logs').insert([newLog]);
    }

    const db = loadLocalDB();
    db.scrape_logs.push(newLog);
    saveLocalDB(db);
    return newLog;
  },

  async getPriceHistory(trackedProductId) {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('price_history').select('*').eq('tracked_product_id', trackedProductId).order('scraped_at', { ascending: true });
      if (!error) return data;
    }
    const db = loadLocalDB();
    return db.price_history
      .filter(h => h.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));
  },

  async getScrapeLogs(trackedProductId) {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('scrape_logs').select('*').eq('tracked_product_id', trackedProductId).order('scraped_at', { ascending: false });
      if (!error) return data;
    }
    const db = loadLocalDB();
    return db.scrape_logs
      .filter(l => l.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
  },

  async getAllScrapeLogs() {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('scrape_logs').select('*').order('scraped_at', { ascending: false });
      if (!error) return data;
    }
    const db = loadLocalDB();
    return db.scrape_logs.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
  },

  async addAlert(alert) {
    const newAlert = {
      id: alert.id || require('crypto').randomUUID(),
      tracked_product_id: alert.tracked_product_id,
      product_id: String(alert.product_id),
      product_name: alert.product_name,
      selected_option_label: alert.selected_option_label,
      alert_type: alert.alert_type,
      message: alert.message,
      is_read: false,
      created_at: new Date().toISOString()
    };

    if (!useLocalFallback && supabase) {
      await supabase.from('price_alerts').insert([newAlert]);
    }

    const db = loadLocalDB();
    db.price_alerts.unshift(newAlert);
    saveLocalDB(db);
    return newAlert;
  },

  async getAlerts() {
    if (!useLocalFallback && supabase) {
      const { data, error } = await supabase.from('price_alerts').select('*').order('created_at', { ascending: false });
      if (!error) return data;
    }
    const db = loadLocalDB();
    return db.price_alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

module.exports = DB;
