const { chromium } = require('playwright');

async function testScrapeProductOption(productId, targetOptionText = '2-pack') {
  console.log(`Starting test scrape for product ${productId}, target option "${targetOptionText}"...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    const url = `https://demo.inelabteamdev.com/item/${productId}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Click target option button
    const optBtn = page.locator(`button:has-text("${targetOptionText}")`).first();
    if (await optBtn.count() > 0) {
      console.log(`Clicking option button "${targetOptionText}"...`);
      await optBtn.click();
      await page.waitForTimeout(500);
    }

    // Trigger price load
    const button = page.locator('button.ctl-main, button:has-text("Check today’s price"), button:has-text("Check price"), button:has-text("CHECK AGAIN")').first();
    if (await button.count() > 0) {
      const box = await button.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.evaluate(() => {
          const el = document.querySelector('button.ctl-main') || document.body;
          const rect = el.getBoundingClientRect();
          for (let i = 0; i < 50; i++) {
            el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: rect.left + i, clientY: rect.top + i }));
          }
        });
        await page.waitForTimeout(600);
        console.log('Clicking check price button...');
        await button.click({ force: true });
      }
    }

    await page.waitForTimeout(3500);

    const fullText = await page.innerText('body');
    const priceMatch = fullText.match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    const stockMatch = fullText.match(/(\d+\s*units available|Last few:\s*\d+|Available\s*\(\d+\)|Stock:\s*\d+\s*remaining|Ready to ship[^\n]+|\d+\s*in stock|Out of stock|Delivered in[^\n]+)/i);

    console.log('\n=== RESULT FOR OPTION:', targetOptionText, '===');
    console.log('Price:', priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null);
    console.log('Stock:', stockMatch ? stockMatch[0] : 'NONE');

  } catch (err) {
    console.error('Error during scrape test:', err.message);
  } finally {
    await browser.close();
  }
}

testScrapeProductOption(2475, '2-pack');
