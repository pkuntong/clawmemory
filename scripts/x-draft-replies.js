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

const DRAFTED_FILE = '/Users/gnotnuk/clawd/memory/x-replied-tweets-drafted.json';

function loadDraftedTweets() {
  try {
    const fs = require('fs');
    const data = fs.readFileSync(DRAFTED_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveDraftedTweets(drafted) {
  const fs = require('fs');
  fs.writeFileSync(DRAFTED_FILE, JSON.stringify(drafted, null, 2));
}

function getRecentTweets(handle, count = 2) {
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
      } else if (line && !line.startsWith('─') && !line.startsWith('ℹ️') && !line.startsWith('📍')) {
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

function generateReply(tweetText, author) {
  const replies = {
    witty: [
      `the timeline is moving fast today 🚀`,
      `this is the kind of chaos i signed up for`,
      `vibe coding just got an upgrade`,
      `devs be like: *frantically opens IDE*`,
      `plot twist: you're absolutely right`,
      `this aged well 👀`,
      `my thoughts exactly`
    ],
    technical: [
      `interesting. the context window implications here are massive — could change how we approach multi-file refactoring`,
      `wondering about the latency trade-offs. has anyone benchmarked this against the previous version?`,
      `this architecture choice makes sense for async workloads but i'd be curious about sync performance`,
      `the real unlock here is composability. if this integrates with existing toolchains cleanly, adoption will be rapid`,
      `this approach makes sense. have you considered the scaling implications?`,
      `curious about your implementation details here — did you run into any edge cases?`
    ],
    supportive: [
      `solid take. this is the direction the industry needs to go`,
      `agreed — shipping fast with good tools beats waiting for perfect solutions`,
      `this is exactly what i've been saying. more of this energy`,
      `well put. the nuance here matters and you captured it`,
      `couldn't agree more. you nailed it`,
      `facts. thanks for sharing`,
      `someone had to say it`
    ]
  };
  
  // Pick style based on tweet content
  let style = 'witty';
  if (tweetText.match(/benchmark|performance|latency|architecture|api|code|function|framework|implementation/i)) {
    style = 'technical';
  } else if (tweetText.match(/agree|think|believe|opinion|should|must|believe/i)) {
    style = 'supportive';
  }
  
  const pool = replies[style];
  return pool[Math.floor(Math.random() * pool.length)];
}

function draftReplies() {
  console.log('Starting tweet monitoring and drafting...');
  const drafted = loadDraftedTweets();
  let newDrafts = 0;
  const maxDrafts = 5; // Limit per run
  
  const drafts = [];
  
  for (const handle of TARGET_ACCOUNTS) {
    if (newDrafts >= maxDrafts) break;
    
    console.log(`Checking @${handle}...`);
    const tweets = getRecentTweets(handle, 2);
    
    for (const tweet of tweets) {
      if (newDrafts >= maxDrafts) break;
      if (drafted.includes(tweet.id)) continue;
      if (!tweet.text || tweet.text.length < 20) continue;
      
      const reply = generateReply(tweet.text, handle);
      
      drafts.push({
        handle: `@${handle}`,
        tweetText: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
        tweetUrl: tweet.url,
        reply: reply,
        tweetId: tweet.id
      });
      
      drafted.push(tweet.id);
      newDrafts++;
    }
  }
  
  // Log all drafts
  const fs = require('fs');
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  let logEntry = `\n\n## Reply Drafts - ${timestamp}\n\n`;
  
  for (const draft of drafts) {
    logEntry += `### Reply to ${draft.handle}\n`;
    logEntry += `**Original tweet:** ${draft.tweetText}\n`;
    logEntry += `**Tweet URL:** ${draft.tweetUrl}\n`;
    logEntry += `**Suggested reply:** "${draft.reply}"\n`;
    logEntry += `**Copy/paste command:** \`bird reply ${draft.tweetId} "${draft.reply}" --auth-token ${AUTH_TOKEN} --ct0 ${CT0}\`\n\n`;
    logEntry += '---\n\n';
  }
  
  fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
  saveDraftedTweets(drafted);
  
  console.log(`Drafted ${newDrafts} replies. Check the log file for copy/paste commands.`);
  
  // Also output a summary for Telegram
  if (drafts.length > 0) {
    let summary = `📝 **Reply Drafts Ready**\n\n`;
    for (const draft of drafts) {
      summary += `**${draft.handle}:** "${draft.reply}"\n`;
      summary += `Tweet: ${draft.tweetUrl}\n\n`;
    }
    summary += `📋 **Full commands in:** /Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md`;
    console.log(summary);
  }
}

draftReplies();
