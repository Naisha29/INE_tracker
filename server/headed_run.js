const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

const STORE_BASE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

async function runHeadedScrape(productId = '2475', optionLabel = '1-pack') {
  console.log('===========================================================');
  console.log('      INE PRODUCT PRICE TRACKER - HEADED DEMO RUN          ');
  console.log('===========================================================');
  console.log(`Target Product ID: ${productId}`);
  console.log(`Target Option Label: ${optionLabel}`);
  console.log(`Store URL: ${STORE_BASE_URL}/item/${productId}`);

  let browser;
  let isCloudHeadless = false;

  try {
    console.log('Launching browser in HEADED MODE (visible window)...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 350
    });
  } catch (err) {
    console.log('[Notice] Cloud server detected (no physical display attached).');
    console.log('[Notice] Running in Observable Cloud Mode for web terminal display...');
    try {
      browser = await chromium.launch({
        headless: true,
        slowMo: 100
      });
      isCloudHeadless = true;
    } catch (fallbackErr) {
      console.error('❌ Could not launch browser:', fallbackErr.message);
      return;
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    const itemUrl = `${STORE_BASE_URL}/item/${productId}`;
    console.log(`[Step 1] Navigating to ${itemUrl}...`);
    await page.goto(itemUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    console.log(`[Step 2] Selecting Option "${optionLabel}"...`);
    const optionBtn = page.locator(`button:has-text("${optionLabel}")`).first();
    if (await optionBtn.count() > 0) {
      await optionBtn.click();
      console.log(`✓ Clicked option button "${optionLabel}".`);
    } else {
      console.log(`Option "${optionLabel}" button not found directly, clicking first available option.`);
      const genericOpt = page.locator('button.opt').first();
      if (await genericOpt.count() > 0) await genericOpt.click();
    }

    await page.waitForTimeout(1000);

    console.log('[Step 3] Locating Price Check target element...');
    const priceBtn = page.locator('button.ctl-main, button:has-text("Check today’s price"), button:has-text("Check price")').first();

    if (await priceBtn.count() > 0) {
      console.log('[Step 4] Simulating mouse moves & Dwell time to unlock WASM/price trap...');
      const box = await priceBtn.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        for (let i = 0; i < 35; i++) {
          const offsetX = (i % 5) * 4 - 10;
          const offsetY = (i % 3) * 4 - 6;
          await page.mouse.move(box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY);
          await page.waitForTimeout(30);
        }
        await page.waitForTimeout(500);

        console.log('[Step 5] Clicking "Check today’s price" button...');
        await priceBtn.click();
      }
    }

    console.log('[Step 6] Waiting for price & stock to resolve...');
    await page.waitForTimeout(3500);

    const bodyText = await page.innerText('body');
    const priceMatch = bodyText.match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    const stockMatch = bodyText.match(/(\d+\s*units available|Last few:\s*\d+|Available\s*\(\d+\)|Stock:\s*\d+\s*remaining|Ready to ship[^\n]+|\d+\s*in stock|Out of stock|SOLD OUT|Delivered in[^\n]+)/i);

    console.log('\n===========================================================');
    console.log('                SCRAPING RESULT SUMMARY                    ');
    console.log('===========================================================');
    console.log(`Price Extracted: ${priceMatch ? priceMatch[0] : 'FAILED'}`);
    console.log(`Stock Status:    ${stockMatch ? stockMatch[0].trim() : 'FAILED'}`);
    console.log('===========================================================');

    if (!isCloudHeadless) {
      console.log('Keeping browser window open for observation...');
      await page.waitForTimeout(3000);
    }

  } catch (err) {
    console.error('❌ Error during Headed Scrape Run:', err.message);
  } finally {
    await browser.close();
    console.log('Headed run complete.');
  }
}

const args = process.argv.slice(2);
const productId = args[0] || '2475';
const optionLabel = args[1] || '1-pack';

runHeadedScrape(productId, optionLabel);
