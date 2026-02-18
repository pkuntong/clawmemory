const { chromium } = require('playwright');
const { execSync } = require('child_process');

const AUTH_TOKEN = 'ad09349bee5e5e47179f113f44a6dbb9de8a1e88';
const CT0 = 'bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba';

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

async function getFollowing() {
  try {
    const output = execSync(
      `bird following -n 50 --auth-token ${AUTH_TOKEN} --ct0 ${CT0} --plain`,
      { encoding: 'utf8', timeout: 30000 }
    );
    
    const handles = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/@(\w+)/);
      if (match && !handles.includes(match[1])) {
        handles.push(match[1]);
      }
    }
    
    return handles.slice(0, 20); // Top 20 people user follows
  } catch (err) {
    console.error('Error getting following:', err.message);
    return [];
  }
}

async function getRecentTweets(handle, count = 2) {
  try {
    const output = execSync(
      `bird user-tweets @${handle} -n ${count} --auth-token ${AUTH_TOKEN} --ct0 ${CT0} --plain`,
      { encoding: 'utf8', timeout: 30000 }
    );
    
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
      } else if (line && !line.startsWith('─') && !line.startsWith('ℹ️') && !line.startsWith('📍')) {
        if (!currentTweet.text) currentTweet.text = line.trim();
      }
      
      if (currentTweet.id && currentTweet.text && !tweets.find(t => t.id === currentTweet.id)) {
        tweets.push({...currentTweet});
        currentTweet = {};
      }
    }
    
    return tweets.filter(t => t.id && t.text && t.text.length > 15);
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
    
    const replyBtn = await page.locator('[data-testid="reply"]').first();
    await replyBtn.click();
    await page.waitForTimeout(2000);
    
    const editor = await page.locator('[data-testid="tweetTextarea_0"], div[contenteditable="true"]').first();
    await editor.fill(replyText);
    await page.waitForTimeout(1000);
    
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
  // More personalized replies for people the user follows
  const replies = {
    witty: [
      `this aged well 👀`,
      `plot twist: you're absolutely right`,
      `the algorithm is learning from you`,
      `someone had to say it`,
      `my thoughts exactly`
    ],
    technical: [
      `curious about your implementation details here — did you run into any edge cases?`,
      `this approach makes sense. have you considered the scaling implications?`,
      `solid architecture. the async handling here is clean`,
      `interesting trade-off. i'd love to see benchmarks on this`,
      `this is the kind of thinking that moves the industry forward`
    ],
    supportive: [
      `absolutely. more people need to hear this`,
      `well said — this resonates`,
      `couldn't agree more. you nailed it`,
      `this is the energy we need`,
      `facts. thanks for sharing`
    ]
  };
  
  let style = 'witty';
  if (tweetText.match(/code|build|ship|deploy|api|function|class|framework/i)) {
    style = 'technical';
  } else if (tweetText.match(/believe|think|feel|opinion|agree|disagree/i)) {
    style = 'supportive';
  }
  
  const pool = replies[style];
  return pool[Math.floor(Math.random() * pool.length)];
}

async function runFollowingEngagement() {
  console.log('Starting following engagement...');
  const replied = await loadRepliedTweets();
  
  const following = await getFollowing();
  console.log(`Found ${following.length} accounts to check`);
  
  let newReplies = 0;
  const maxReplies = 5; // Limit per run
  
  for (const handle of following) {
    if (newReplies >= maxReplies) break;
    
    console.log(`Checking @${handle}...`);
    const tweets = await getRecentTweets(handle, 2);
    
    for (const tweet of tweets) {
      if (newReplies >= maxReplies) break;
      if (replied.includes(tweet.id)) continue;
      if (!tweet.text || tweet.text.length < 20) continue;
      
      const reply = generateReply(tweet.text, handle);
      console.log(`Replying to @${handle}: ${reply}`);
      
      const success = await postReply(tweet.url, reply);
      if (success) {
        replied.push(tweet.id);
        newReplies++;
        await saveRepliedTweets(replied);
        
        const fs = require('fs');
        const logEntry = `\n${new Date().toISOString()} | Reply to @${handle}: ${reply} | ${tweet.url}\n`;
        fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
        
        await new Promise(r => setTimeout(r, 45000)); // Longer delay for following
      }
    }
  }
  
  console.log(`Following engagement complete. New replies: ${newReplies}`);
}

runFollowingEngagement().catch(console.error);
