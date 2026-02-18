const { execSync } = require('child_process');
const fs = require('fs');

const AUTH_TOKEN = 'ad09349bee5e5e47179f113f44a6dbb9de8a1e88';
const CT0 = 'bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba';

class StealthXPoster {
  constructor() {
    this.postedToday = this.loadPostedToday();
    this.lastPostTime = Date.now() - (Math.random() * 3600000); // Random start
  }

  loadPostedToday() {
    try {
      const data = fs.readFileSync('/Users/gnotnuk/clawd/memory/x-posted-today.json', 'utf8');
      const posted = JSON.parse(data);
      const today = new Date().toDateString();
      
      if (posted.date !== today) {
        return { date: today, count: 0, posts: [] };
      }
      return posted;
    } catch {
      return { date: new Date().toDateString(), count: 0, posts: [] };
    }
  }

  savePostedToday() {
    fs.writeFileSync('/Users/gnotnuk/clawd/memory/x-posted-today.json', JSON.stringify(this.postedToday, null, 2));
  }

  async humanDelay(minMs = 2000, maxMs = 8000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    console.log(`Waiting ${delay}ms before next action...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async tryPost(type, command, tweetId, text) {
    try {
      // Add random delays to look human
      await this.humanDelay(3000, 12000);
      
      console.log(`Attempting ${type}: ${text.substring(0, 50)}...`);
      const output = execSync(command, { encoding: 'utf8', timeout: 30000 });
      
      this.postedToday.count++;
      this.postedToday.posts.push({
        type,
        tweetId,
        text,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      console.log(`✅ ${type} successful!`);
      this.savePostedToday();
      return true;
      
    } catch (err) {
      console.log(`❌ ${type} failed:`, err.message.substring(0, 100));
      
      this.postedToday.posts.push({
        type,
        tweetId,
        text,
        timestamp: new Date().toISOString(),
        success: false,
        error: err.message.substring(0, 200)
      });
      
      this.savePostedToday();
      return false;
    }
  }

  async executeEngagementPlan() {
    console.log('🤖 Starting stealth engagement session...');
    console.log(`Posted today: ${this.postedToday.count}/30+`);
    
    // Get fresh engagement targets
    const engagementTargets = this.generateTargets();
    
    for (let i = 0; i < engagementTargets.length && this.postedToday.count < 35; i++) {
      const target = engagementTargets[i];
      
      // Skip if we already tried this tweet today
      if (this.postedToday.posts.some(p => p.tweetId === target.tweetId)) {
        continue;
      }
      
      const success = await this.tryPost(
        target.action.type,
        target.action.command,
        target.tweetId,
        target.action.text
      );
      
      if (success) {
        // Log successful engagement
        const fs = require('fs');
        const logEntry = `\n${new Date().toISOString()} | ${target.action.type} @${target.handle}: "${target.action.text}" | ${target.tweetUrl}\n`;
        fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
      }
      
      // Random longer delay between actions
      await this.humanDelay(15000, 45000);
    }
    
    console.log(`Session complete. Total posted today: ${this.postedToday.count}`);
  }

  generateTargets() {
    // This would normally fetch fresh tweets, but for now we'll use pre-generated targets
    // In production, this would call the engagement plan generator
    
    return [
      {
        handle: 'saranshhx',
        tweetId: '2019653523865313323',
        tweetUrl: 'https://x.com/saranshhx/status/2019653523865313323',
        action: {
          type: 'like',
          text: 'Like - facts',
          command: 'bird like 2019653523865313323 --auth-token ad09349bee5e5e47179f113f44a6dbb9de8a1e88 --ct0 bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba'
        }
      },
      {
        handle: 'brockpierson',
        tweetId: '2019760739343294677',
        tweetUrl: 'https://x.com/brockpierson/status/2019760739343294677',
        action: {
          type: 'reply',
          text: 'the timeline is moving fast today 🚀',
          command: 'bird reply 2019760739343294677 "the timeline is moving fast today 🚀" --auth-token ad09349bee5e5e47179f113f44a6dbb9de8a1e88 --ct0 bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba'
        }
      },
      {
        handle: 'denicmarko',
        tweetId: '2019789953362784513',
        tweetUrl: 'https://x.com/denicmarko/status/2019789953362784513',
        action: {
          type: 'like',
          text: 'Like - well said',
          command: 'bird like 2019789953362784513 --auth-token ad09349bee5e5e47179f113f44a6dbb9de8a1e88 --ct0 bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba'
        }
      }
    ];
  }
}

// Run the stealth engagement
const poster = new StealthXPoster();
poster.executeEngagementPlan().catch(console.error);
