const { chromium } = require('playwright');

const AUTH_TOKEN = 'ad09349bee5e5e47179f113f44a6dbb9de8a1e88';
const CT0 = 'bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba';

async function postTweet(text) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  // Set cookies
  await context.addCookies([
    { name: 'auth_token', value: AUTH_TOKEN, domain: '.x.com', path: '/' },
    { name: 'ct0', value: CT0, domain: '.x.com', path: '/' }
  ]);
  
  const page = await context.newPage();
  
  try {
    // Go to X
    await page.goto('https://x.com');
    await page.waitForTimeout(3000);
    
    // Click compose button
    await page.click('a[href="/compose/post"], button[aria-label*="Post"]');
    await page.waitForTimeout(2000);
    
    // Type tweet
    const editor = await page.locator('[data-testid="tweetTextarea_0"], div[contenteditable="true"]').first();
    await editor.fill(text);
    await page.waitForTimeout(1000);
    
    // Click post
    await page.click('button[data-testid="tweetButton"], button:has-text("Post")');
    await page.waitForTimeout(3000);
    
    console.log('Tweet posted:', text);
    await browser.close();
    return true;
  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    return false;
  }
}

const tweet = process.argv[2];
if (!tweet) {
  console.log('Usage: node post-tweet.js "your tweet text"');
  process.exit(1);
}

postTweet(tweet);
