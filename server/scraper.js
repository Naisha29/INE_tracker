const { chromium } = require('playwright');
const axios = require('axios');
const DB = require('./db');

const STORE_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';
const MAX_RETRIES = 3;

/**
 * Check if the store's page structure / manifest has changed
 */
async function detectPageStructureChange() {
  try {
    const res = await axios.get(`${STORE_BASE_URL}/api/v2/ui/manifest`, { timeout: 5000 });
    const manifest = res.data;
    // Expected manifest keys
    const expectedClasses = ['priceWrap', 'priceValue', 'mrp', 'sale', 'badge', 'stock'];
    const missingKeys = expectedClasses.filter(k => !manifest.classes || !manifest.classes[k]);
    if (missingKeys.length > 0) {
      console.warn('[Change Detection] Manifest structure altered! Missing keys:', missingKeys);
      return { changed: true, reason: `Manifest keys changed: missing ${missingKeys.join(', ')}` };
    }
    return { changed: false, manifest };
  } catch (err) {
    console.warn('[Change Detection] Could not fetch manifest:', err.message);
    return { changed: false, reason: 'Manifest endpoint unreachable' };
  }
}

/**
 * Execute single scrape attempt with Playwright
 */
async function executeSingleAttempt(productId, optionId, optionLabel, isHeaded = false) {
  const startTime = Date.now();
  const browser = await chromium.launch({
    headless: !isHeaded,
    slowMo: isHeaded ? 300 : 0
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    const itemUrl = `${STORE_BASE_URL}/item/${productId}`;
    console.log(`[Scraper] Navigating to ${itemUrl} (Headed: ${isHeaded})...`);
    await page.goto(itemUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);

    // Option selection logic
    if (optionLabel || optionId) {
      const optionSelectors = [
        `button:has-text("${optionLabel}")`,
        `button[data-option-id="${optionId}"]`,
        `button.opt:has-text("${optionLabel}")`
      ];
      
      let optionClicked = false;
      for (const sel of optionSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.count() > 0) {
          console.log(`[Scraper] Clicking option element: ${sel}`);
          await btn.click();
          await page.waitForTimeout(500);
          optionClicked = true;
          break;
        }
      }
      if (!optionClicked) {
        // Fallback: click option by index if available
        const genericOptBtns = page.locator('button.opt, button[class*="opt"]');
        if (await genericOptBtns.count() > 0) {
          await genericOptBtns.first().click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Hover sequence to trigger price loading
    const priceTargetLocators = [
      'button.ctl-main',
      'button:has-text("Check today’s price")',
      'button:has-text("Check price")',
      'button:has-text("CHECK AGAIN")',
      '.ctl-main'
    ];

    let targetElement = null;
    for (const sel of priceTargetLocators) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        targetElement = loc;
        break;
      }
    }

    if (targetElement) {
      const box = await targetElement.boundingBox();
      if (box) {
        // Center mouse
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        
        // Smooth jitter over 750ms to satisfy >40 moves & >500ms dwell time
        const steps = 30;
        for (let i = 0; i < steps; i++) {
          const offsetX = (i % 5) * 4 - 10;
          const offsetY = (i % 3) * 4 - 6;
          await page.mouse.move(box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY);
          await page.waitForTimeout(25);
        }
        await page.waitForTimeout(200);

        // Click button
        console.log('[Scraper] Clicking check price button...');
        await targetElement.click({ force: true });
      }
    } else {
      console.warn('[Scraper] Price button selector not found directly, scanning page...');
    }

    // Wait for price render
    await page.waitForTimeout(3000);

    const bodyText = await page.innerText('body');
    const executionTimeMs = Date.now() - startTime;

    // Price Regex: e.g. ₹29,470 or ₹ 42.90 or Rs. 1499
    const priceMatch = bodyText.match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    // Stock Regex: e.g. LAST FEW: 136, 12 units available, Out of stock, SOLD OUT
    const stockMatch = bodyText.match(/(\d+\s*units available|Last few:\s*\d+|Available\s*\(\d+\)|Stock:\s*\d+\s*remaining|Ready to ship[^\n]+|\d+\s*in stock|Out of stock|SOLD OUT|Delivered in[^\n]+)/i);

    if (!priceMatch) {
      throw new Error('Price element not rendered or locked after hover attempt');
    }

    const priceVal = parseFloat(priceMatch[1].replace(/,/g, ''));
    const stockStr = stockMatch ? stockMatch[0].trim() : 'In Stock';

    // Parse numeric stock count if present
    let stockCount = null;
    const numMatch = stockStr.match(/\d+/);
    if (numMatch) {
      stockCount = parseInt(numMatch[0], 10);
    } else if (stockStr.toLowerCase().includes('sold out') || stockStr.toLowerCase().includes('out of stock')) {
      stockCount = 0;
    }

    return {
      success: true,
      price: priceVal,
      currency: '₹',
      stockStatus: stockStr,
      stockCount: stockCount,
      executionTimeMs,
      bodySnippet: bodyText.slice(0, 300)
    };

  } catch (err) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: err.message,
      executionTimeMs
    };
  } finally {
    await browser.close();
  }
}

/**
 * Main Scrape Handler with Retries and Logging
 */
async function scrapeProduct(trackedProduct, isHeaded = false) {
  const { id: tracked_product_id, product_id, product_name, selected_option_id, selected_option_label, target_price } = trackedProduct;
  const isoTimestamp = new Date().toISOString();

  console.log(`\n==================================================`);
  console.log(`[Scrape Run] Starting scrape for product ${product_id} (${product_name} - ${selected_option_label})`);
  console.log(`[Scrape Run] Timestamp: ${isoTimestamp}`);

  // Check page structure change
  const structureCheck = await detectPageStructureChange();

  let attempt = 1;
  let result = null;
  let finalOutcome = 'failed';

  while (attempt <= MAX_RETRIES) {
    console.log(`[Scrape Run] Attempt ${attempt}/${MAX_RETRIES}...`);
    result = await executeSingleAttempt(product_id, selected_option_id, selected_option_label, isHeaded);

    if (result.success) {
      finalOutcome = 'success';
      console.log(`[Scrape Run] Attempt ${attempt} SUCCESS! Extracted Price: ₹${result.price}, Stock: ${result.stockStatus}`);

      // Log successful attempt
      await DB.addScrapeLogRecord({
        tracked_product_id,
        product_id,
        product_name,
        selected_option_label,
        scraped_at: isoTimestamp,
        attempt_number: attempt,
        outcome: 'success',
        price: result.price,
        stock: result.stockStatus,
        execution_time_ms: result.executionTimeMs,
        error_message: null,
        change_detected: structureCheck.changed
      });

      // Save price history
      await DB.addPriceHistoryRecord({
        tracked_product_id,
        product_id,
        product_name,
        selected_option_label,
        price: result.price,
        currency: result.currency,
        stock_status: result.stockStatus,
        stock_count: result.stockCount,
        scraped_at: isoTimestamp,
        outcome: 'success'
      });

      // Update tracked product last scraped time
      await DB.updateTrackedProduct(tracked_product_id, {
        last_scraped_at: isoTimestamp
      });

      // Price Drop & Stock Alerts Check
      if (target_price && result.price <= target_price) {
        await DB.addAlert({
          tracked_product_id,
          product_id,
          product_name,
          selected_option_label,
          alert_type: 'price_drop',
          message: `🎯 Target price reached! Current price ₹${result.price} is <= target ₹${target_price}.`
        });
      }

      if (structureCheck.changed) {
        await DB.addAlert({
          tracked_product_id,
          product_id,
          product_name,
          selected_option_label,
          alert_type: 'structure_change',
          message: `⚠️ Store structure change detected: ${structureCheck.reason}`
        });
      }

      return {
        success: true,
        price: result.price,
        stock: result.stockStatus,
        outcome: 'success',
        attempt
      };
    } else {
      console.warn(`[Scrape Run] Attempt ${attempt} FAILED: ${result.error}`);

      if (attempt < MAX_RETRIES) {
        // Record retry attempt in scrape logs
        await DB.addScrapeLogRecord({
          tracked_product_id,
          product_id,
          product_name,
          selected_option_label,
          scraped_at: new Date().toISOString(),
          attempt_number: attempt,
          outcome: 'retried',
          price: null,
          stock: null,
          execution_time_ms: result.executionTimeMs,
          error_message: `Attempt ${attempt} failed: ${result.error}. Retrying...`,
          change_detected: structureCheck.changed
        });

        // Exponential backoff pause before retry
        const backoffMs = attempt * 2000;
        console.log(`[Scrape Run] Waiting ${backoffMs}ms before retry...`);
        await new Promise(r => setTimeout(r, backoffMs));
      }
      attempt++;
    }
  }

  // All retries failed - Record honest failure
  console.error(`[Scrape Run] ALL ${MAX_RETRIES} attempts FAILED for ${product_name}.`);

  await DB.addScrapeLogRecord({
    tracked_product_id,
    product_id,
    product_name,
    selected_option_label,
    scraped_at: isoTimestamp,
    attempt_number: MAX_RETRIES,
    outcome: 'failed',
    price: null,
    stock: null,
    execution_time_ms: result ? result.executionTimeMs : 0,
    error_message: `Failed after ${MAX_RETRIES} attempts: ${result ? result.error : 'Unknown error'}`,
    change_detected: structureCheck.changed
  });

  await DB.addPriceHistoryRecord({
    tracked_product_id,
    product_id,
    product_name,
    selected_option_label,
    price: null,
    currency: '₹',
    stock_status: 'Failed Scrape',
    stock_count: null,
    scraped_at: isoTimestamp,
    outcome: 'failed'
  });

  await DB.updateTrackedProduct(tracked_product_id, {
    last_scraped_at: isoTimestamp
  });

  return {
    success: false,
    price: null,
    stock: null,
    outcome: 'failed',
    attempt: MAX_RETRIES,
    error: result ? result.error : 'Max retries exceeded'
  };
}

module.exports = {
  scrapeProduct,
  detectPageStructureChange
};
