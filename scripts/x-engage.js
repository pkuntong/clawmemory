const { chromium } = require('playwright');
const { execSync } = require('child_process');

const AUTH_TOKEN = 'ad09349bee5e5e47179f113f44a6dbb9de8a1e88';
const CT0 = 'bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba';

const TARGET_ACCOUNTS = [
  'AnthropicAI',
  'OpenAI',
  'Google',
  'sama',
  'gdb',
  'karpathy',
  'ylecun',
  'DrJimFan',
  'swyx',
  'mattshumer_'
];

const REPLIED_FILE = '/Users/gnotnuk/clawd/memory/x-replied-tweets.json';

async function loadRepliedTweets() {
  try {
    const fs = require('fs');
    const data = fs.readFileSync(REPLIED_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRepliedTweets(replied) {
  const fs = require('fs');
  fs.writeFileSync(REPLIED_FILE, JSON.stringify(replied, null, 2));
}

async function getRecentTweets(handle, count = 3) {
  try {
    const output = execSync(
      `bird user-tweets @${handle} -n ${count} --auth-token ${AUTH_TOKEN} --ct0 ${CT0} --plain`,
      { encoding: 'utf8', timeout: 30000 }
    );
    
    // Parse tweets from output
    const tweets = [];
    const lines = output.split('\n');
    let currentTweet = {};
    
    for (const line of lines) {
      if (line.includes('https://x.com/') && line.includes('/status/')) {
        const match = line.match(/status\/(\d+)/);
        if (match) {
          currentTweet.id = match[1];
          currentTweet.url = line.trim();
        }
      } else if (line.startsWith('@')) {
        currentTweet.handle = line.split(':')[0].trim();
      } else if (line && !line.startsWith('─') && !line.startsWith('ℹ️')) {
        if (!currentTweet.text) currentTweet.text = line.trim();
      }
      
      if (currentTweet.id && currentTweet.text && !tweets.find(t => t.id === currentTweet.id)) {
        tweets.push({...currentTweet});
        currentTweet = {};
      }
    }
    
    return tweets.filter(t => t.id && t.text);
  } catch (err) {
    console.error(`Error fetching @${handle}:`, err.message);
    return [];
  }
}

async function postReply(tweetUrl, replyText) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }});
  await context.addCookies([
    { name: 'auth_token', value: AUTH_TOKEN, domain: '.x.com', path: '/' },
    { name: 'ct0', value: CT0, domain: '.x.com', path: '/' }
  ]);
  
  const page = await context.newPage();
  
  try {
    await page.goto(tweetUrl);
    await page.waitForTimeout(3000);
    
    // Click reply button
    const replyBtn = await page.locator('[data-testid="reply"]').first();
    await replyBtn.click();
    await page.waitForTimeout(2000);
    
    // Type reply
    const editor = await page.locator('[data-testid="tweetTextarea_0"], div[contenteditable="true"]').first();
    await editor.fill(replyText);
    await page.waitForTimeout(1000);
    
    // Click reply
    await page.click('button[data-testid="tweetButton"], button:has-text("Reply")');
    await page.waitForTimeout(3000);
    
    console.log('Reply posted:', replyText.substring(0, 50) + '...');
    await browser.close();
    return true;
  } catch (err) {
    console.error('Reply error:', err.message);
    await browser.close();
    return false;
  }
}

function generateReply(tweetText, author) {
  const replies = {
    witty: [
      `the timeline is moving fast today 🚀`,
      `this is the kind of chaos i signed up for`,
      `vibe coding just got an upgrade`,
      `devs be like: *frantically opens IDE*`
    ],
    technical: [
      `interesting. the context window implications here are massive — could change how we approach multi-file refactoring`,
      `wondering about the latency trade-offs. has anyone benchmarked this against the previous version?`,
      `this architecture choice makes sense for async workloads but i'd be curious about sync performance`,
      `the real unlock here is composability. if this integrates with existing toolchains cleanly, adoption will be rapid`
    ],
    supportive: [
      `solid take. this is the direction the industry needs to go`,
      `agreed — shipping fast with good tools beats waiting for perfect solutions`,
      `this is exactly what i've been saying. more of this energy`,
      `well put. the nuance here matters and you captured it`
    ]
  };
  
  // Pick style based on tweet content
  let style = 'witty';
  if (tweetText.match(/benchmark|performance|latency|architecture|api/i)) {
    style = 'technical';
  } else if (tweetText.match(/agree|think|believe|opinion/i)) {
    style = 'supportive';
  }
  
  const pool = replies[style];
  return pool[Math.floor(Math.random() * pool.length)];
}

async function runEngagement() {
  console.log('Starting engagement run...');
  const replied = await loadRepliedTweets();
  let newReplies = 0;
  
  for (const handle of TARGET_ACCOUNTS) {
    console.log(`Checking @${handle}...`);
    const tweets = await getRecentTweets(handle, 2);
    
    for (const tweet of tweets) {
      if (replied.includes(tweet.id)) continue;
      if (!tweet.text || tweet.text.length < 20) continue;
      
      const reply = generateReply(tweet.text, handle);
      console.log(`Replying to @${handle}: ${reply.substring(0, 50)}...`);
      
      const success = await postReply(tweet.url, reply);
      if (success) {
        replied.push(tweet.id);
        newReplies++;
        await saveRepliedTweets(replied);
        
        // Log reply
        const fs = require('fs');
        const logEntry = `\n${new Date().toISOString()} | Replied to @${handle}: ${reply.substring(0, 60)}... | Tweet: ${tweet.url}\n`;
        fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
        
        // Delay between replies
        await new Promise(r => setTimeout(r, 30000));
      }
    }
  }
  
  console.log(`Engagement run complete. New replies: ${newReplies}`);
}

runEngagement().catch(console.error);
