const { execSync } = require('child_process');

const AUTH_TOKEN = 'ad09349bee5e5e47179f113f44a6dbb9de8a1e88';
const CT0 = 'bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba';

function getHomeTimeline(count = 20) {
  try {
    const output = execSync(
      `bird home -n ${count} --auth-token ${AUTH_TOKEN} --ct0 ${CT0} --plain`,
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
    
    return tweets.filter(t => t.id && t.text && t.text.length > 10).slice(0, 15);
  } catch (err) {
    console.error('Error fetching timeline:', err.message);
    return [];
  }
}

function getFollowing() {
  try {
    const output = execSync(
      `bird following -n 30 --auth-token ${AUTH_TOKEN} --ct0 ${CT0} --plain`,
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
    
    return handles.slice(0, 20);
  } catch (err) {
    console.error('Error getting following:', err.message);
    return [];
  }
}

function getRecentTweets(handle, count = 2) {
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
    
    return tweets.filter(t => t.id && t.text);
  } catch (err) {
    console.error(`Error fetching @${handle}:`, err.message);
    return [];
  }
}

function generateEngagementAction(tweetText, author) {
  const actions = {
    like: [
      'Like this tweet - good insight',
      'Like - well said',
      'Like - solid take',
      'Like - this resonates',
      'Like - facts'
    ],
    retweet: [
      'Retweet - more people need to see this',
      'Retweet - spreading the word',
      'Retweet - this is important',
      'Retweet - absolutely',
      'Retweet - 100%'
    ],
    reply: [
      'this aged well 👀',
      'the timeline is moving fast today 🚀',
      'this is the kind of chaos i signed up for',
      'devs be like: *frantically opens IDE*',
      'plot twist: you\'re absolutely right',
      'my thoughts exactly',
      'this aged well 👀',
      'facts. thanks for sharing',
      'someone had to say it',
      'the algorithm is learning from you'
    ]
  };
  
  // Decide action based on content
  let actionType = 'like';
  let style = 'reply';
  
  if (tweetText.match(/announcement|news|breaking|important/i)) {
    actionType = Math.random() > 0.5 ? 'retweet' : 'like';
  } else if (tweetText.match(/question|what|how|why/i) && tweetText.length < 200) {
    actionType = 'reply';
    style = 'reply';
  } else if (tweetText.match(/opinion|think|believe|should/i)) {
    actionType = Math.random() > 0.3 ? 'reply' : 'like';
    style = 'reply';
  } else if (Math.random() > 0.7) {
    actionType = 'reply';
    style = 'reply';
  }
  
  if (actionType === 'reply') {
    const pool = actions.reply;
    return {
      type: 'reply',
      text: pool[Math.floor(Math.random() * pool.length)],
      command: `bird reply ${author} "${pool[Math.floor(Math.random() * pool.length)]}" --auth-token ${AUTH_TOKEN} --ct0 ${CT0}`
    };
  } else if (actionType === 'retweet') {
    return {
      type: 'retweet',
      text: actions.retweet[Math.floor(Math.random() * actions.retweet.length)],
      command: `bird retweet ${author} --auth-token ${AUTH_TOKEN} --ct0 ${CT0}`
    };
  } else {
    return {
      type: 'like',
      text: actions.like[Math.floor(Math.random() * actions.like.length)],
      command: `bird like ${author} --auth-token ${AUTH_TOKEN} --ct0 ${CT0}`
    };
  }
}

function generateEngagementPlan() {
  console.log('Generating engagement plan...');
  
  const timeline = getHomeTimeline(15);
  const following = getFollowing();
  
  const engagementTargets = [];
  const usedIds = new Set();
  
  // Add timeline tweets
  for (const tweet of timeline) {
    if (!usedIds.has(tweet.id) && engagementTargets.length < 10) {
      const action = generateEngagementAction(tweet.text, tweet.id);
      engagementTargets.push({
        handle: tweet.handle,
        tweetText: tweet.text.substring(0, 80) + (tweet.text.length > 80 ? '...' : ''),
        tweetUrl: tweet.url,
        action: action,
        source: 'timeline'
      });
      usedIds.add(tweet.id);
    }
  }
  
  // Add some from following list
  for (const handle of following.slice(0, 5)) {
    if (engagementTargets.length >= 15) break;
    
    try {
      const tweets = getRecentTweets(handle, 1);
      for (const tweet of tweets) {
        if (!usedIds.has(tweet.id) && engagementTargets.length < 15) {
          const action = generateEngagementAction(tweet.text, tweet.id);
          engagementTargets.push({
            handle: `@${handle}`,
            tweetText: tweet.text.substring(0, 80) + (tweet.text.length > 80 ? '...' : ''),
            tweetUrl: tweet.url,
            action: action,
            source: 'following'
          });
          usedIds.add(tweet.id);
          break; // Only 1 per account
        }
      }
    } catch (err) {
      console.error(`Error with @${handle}:`, err.message);
    }
  }
  
  // Log engagement plan
  const fs = require('fs');
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  let logEntry = `\n\n## Engagement Plan - ${timestamp}\n`;
  logEntry += `**Target:** 30+ interactions per day\n`;
  logEntry += `**Generated:** ${engagementTargets.length} actions\n\n`;
  
  for (let i = 0; i < engagementTargets.length; i++) {
    const target = engagementTargets[i];
    logEntry += `### ${i + 1}. ${target.handle} (${target.source})\n`;
    logEntry += `**Tweet:** ${target.tweetText}\n`;
    logEntry += `**Action:** ${target.action.type} - ${target.action.text}\n`;
    logEntry += `**Command:** \`${target.action.command}\`\n`;
    logEntry += `**URL:** ${target.tweetUrl}\n\n`;
  }
  
  fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
  
  // Summary for Telegram
  let summary = `🎯 **Engagement Plan Ready**\n\n`;
  summary += `Generated ${engagementTargets.length} engagement actions:\n\n`;
  
  const replyCount = engagementTargets.filter(t => t.action.type === 'reply').length;
  const likeCount = engagementTargets.filter(t => t.action.type === 'like').length;
  const retweetCount = engagementTargets.filter(t => t.action.type === 'retweet').length;
  
  summary += `📱 Replies: ${replyCount}\n`;
  summary += `❤️ Likes: ${likeCount}\n`;
  summary += `🔄 Retweets: ${retweetCount}\n\n`;
  
  summary += `**Top targets:**\n`;
  engagementTargets.slice(0, 5).forEach((target, i) => {
    summary += `${i + 1}. ${target.handle} → ${target.action.type}\n`;
  });
  
  summary += `\n📋 **Full plan:** /Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md`;
  console.log(summary);
}

generateEngagementPlan();
