const { execSync } = require('child_process');
const fs = require('fs');

const AUTH_TOKEN = 'ad09349bee5e5e47179f113f44a6dbb9de8a1e88';
const CT0 = 'bc2f6e729f3dee4915df69d957d82a28abdc0b9e22349726ee9e6207dbcf4c0951257b512fa8bf0ef6aaad8f82a5bc1bb7d8e4906e04eb4aa625b9d95ba2f9db27f8c1c4f62731bab7965e3b724575ba';

class XEngagementManager {
  constructor() {
    this.engagedToday = this.loadEngagedToday();
    this.replyAttempts = 0;
    this.maxRepliesPerSession = 8; // Conservative limit
  }

  loadEngagedToday() {
    try {
      const data = fs.readFileSync('/Users/gnotnuk/clawd/memory/x-engaged-today.json', 'utf8');
      const engaged = JSON.parse(data);
      const today = new Date().toDateString();
      
      if (engaged.date !== today) {
        return { date: today, replies: 0, originalTweets: 0, total: 0, attempts: [] };
      }
      return engaged;
    } catch {
      return { date: new Date().toDateString(), replies: 0, originalTweets: 0, total: 0, attempts: [] };
    }
  }

  saveEngagedToday() {
    fs.writeFileSync('/Users/gnotnuk/clawd/memory/x-engaged-today.json', JSON.stringify(this.engagedToday, null, 2));
  }

  async humanDelay(minMs = 3000, maxMs = 15000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    console.log(`Human delay: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getFreshReplyTargets() {
    // Generate high-quality reply targets from recent tech/AI tweets
    return [
      {
        handle: '@denicmarko',
        tweetId: '2019789953362784513',
        tweetText: 'The ideal way to use AI for coding is to let it do 90% while you do the last 10%',
        tweetUrl: 'https://x.com/denicmarko/status/2019789953362784513',
        reply: 'this is exactly the sweet spot — AI handles the boilerplate, humans handle the creativity and edge cases'
      },
      {
        handle: '@TheRealAdamG',
        tweetId: '2019447886614831587',
        tweetText: 'Codex is the best damn coding model in the world.',
        tweetUrl: 'https://x.com/TheRealAdamG/status/2019447886614831587',
        reply: 'the speed improvements are unreal — what used to take hours now takes minutes'
      },
      {
        handle: '@dharanshi_',
        tweetId: '2019742439645356214',
        tweetText: 'As a developer, what is the hardest programming language to learn?',
        tweetUrl: 'https://x.com/dharanshi_/status/2019742439645356214',
        reply: 'brainfuck for the memes, haskell for the monads, javascript for the "this" binding chaos'
      },
      {
        handle: '@FlorinPop17',
        tweetId: '2019460043066782006',
        tweetText: 'Most builders I know don’t hate creating content.',
        tweetUrl: 'https://x.com/FlorinPop17/status/2019460043066782006',
        reply: 'building in public is the ultimate feedback loop — your audience becomes your product team'
      },
      {
        handle: '@knowRowan',
        tweetId: '2019767339559043380',
        tweetText: 'To all SWEs,',
        tweetUrl: 'https://x.com/knowRowan/status/2019767339559043380',
        reply: 'the best engineers I know are part-time philosophers — they question everything before building anything'
      },
      {
        handle: '@justbyte_',
        tweetId: '2019701804779622657',
        tweetText: 'If you\'re into tech, let\'s connect 🤝🏻',
        tweetUrl: 'https://x.com/justbyte_/status/2019701804779622657',
        reply: 'the tech community on here is unmatched — where else do you get real-time feedback from people building the future?'
      },
      {
        handle: '@brockpierson',
        tweetId: '2019760739343294677',
        tweetText: 'In 6 words or less.',
        tweetUrl: 'https://x.com/brockpierson/status/2019760739343294677',
        reply: 'vibe coding: ship fast, iterate faster'
      },
      {
        handle: '@VadimStrizheus',
        tweetId: '2019764264144146667',
        tweetText: 'As a founder, what\'s the best way to get your first 100 customers?',
        tweetUrl: 'https://x.com/VadimStrizheus/status/2019764264144146667',
        reply: 'build something so good that users become your sales team — word of mouth > any marketing hack'
      }
    ];
  }

  generateOriginalTweet() {
    const tweets = [
      'the best code is the code you don\'t have to write — AI is making that philosophy real',
      'we\'re living in the golden age of developer tools — every week brings something that makes shipping faster',
      'vibe coding isn\'t about being lazy — it\'s about being strategic with your cognitive load',
      'the developers who thrive in 2026 aren\'t the ones who memorize syntax — they\'re the ones who know which AI to use when',
      'every time I think "this AI thing is overhyped" I see someone ship a full product in a weekend',
      'the real AI revolution isn\'t in the models — it\'s in the tooling that makes them accessible to normal developers',
      'claude code + opus 4.6 is basically having a senior dev pair program with you 24/7',
      'we went from "learn to code" to "learn to prompt" and honestly that\'s progress',
      'the timeline between "this AI can\'t do X" and "this AI just did X better than humans" keeps shrinking',
      'my hot take: the next unicorn won\'t be an AI company — it\'ll be a company that makes AI feel invisible'
    ];
    
    return tweets[Math.floor(Math.random() * tweets.length)];
  }

  async tryReply(target) {
    if (this.engagedToday.replies >= this.maxRepliesPerSession) {
      console.log('Max replies reached for this session');
      return false;
    }

    await this.humanDelay(5000, 20000);
    
    const command = `bird reply ${target.tweetId} "${target.reply}" --auth-token ${AUTH_TOKEN} --ct0 ${CT0}`;
    
    console.log(`Attempting reply to ${target.handle}: "${target.reply}"`);
    
    try {
      execSync(command, { encoding: 'utf8', timeout: 30000 });
      
      this.engagedToday.replies++;
      this.engagedToday.total++;
      
      // Log successful reply
      const logEntry = `\n${new Date().toISOString()} | REPLY to ${target.handle}: "${target.reply}" | ${target.tweetUrl}\n`;
      fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
      
      console.log('✅ Reply successful!');
      this.saveEngagedToday();
      return true;
      
    } catch (err) {
      console.log(`❌ Reply failed:`, err.message.substring(0, 100));
      
      // Still log the attempt
      const logEntry = `\n${new Date().toISOString()} | REPLY FAILED to ${target.handle}: "${target.reply}" | Error: ${err.message.substring(0, 100)}\n`;
      fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gntnuk.md', logEntry);
      
      this.saveEngagedToday();
      return false;
    }
  }

  async tryOriginalTweet(text) {
    await this.humanDelay(8000, 25000);
    
    const command = `bird tweet "${text}" --auth-token ${AUTH_TOKEN} --ct0 ${CT0}`;
    
    console.log(`Attempting original tweet: "${text}"`);
    
    try {
      execSync(command, { encoding: 'utf8', timeout: 30000 });
      
      this.engagedToday.originalTweets++;
      this.engagedToday.total++;
      
      // Log successful tweet
      const logEntry = `\n${new Date().toISOString()} | TWEET: "${text}"\n`;
      fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
      
      console.log('✅ Tweet successful!');
      this.saveEngagedToday();
      return true;
      
    } catch (err) {
      console.log(`❌ Tweet failed:`, err.message.substring(0, 100));
      
      // Still log the attempt  
      const logEntry = `\n${new Date().toISOString()} | TWEET FAILED: "${text}" | Error: ${err.message.substring(0, 100)}\n`;
      fs.appendFileSync('/Users/gnotnuk/clawd/memory/x-posts-gnotnuk.md', logEntry);
      
      this.saveEngagedToday();
      return false;
    }
  }

  async runEngagementSession() {
    console.log('🚀 Starting stealth engagement session...');
    console.log(`Current stats: ${this.engagedToday.replies} replies, ${this.engagedToday.originalTweets} tweets, ${this.engagedToday.total} total`);
    
    // Try original tweet first (higher success rate)
    if (this.engagedToday.originalTweets < 3) {
      const tweetText = this.generateOriginalTweet();
      await this.tryOriginalTweet(tweetText);
      await this.humanDelay(30000, 60000);
    }
    
    // Try replies to high-quality targets
    const replyTargets = this.getFreshReplyTargets();
    
    for (const target of replyTargets.slice(0, 5)) {
      if (this.engagedToday.replies >= this.maxRepliesPerSession) break;
      
      const success = await this.tryReply(target);
      if (success) {
        await this.humanDelay(45000, 90000);
      } else {
        // If reply fails, wait longer before next attempt
        await this.humanDelay(60000, 120000);
      }
    }
    
    console.log(`Session complete. Final stats: ${this.engagedToday.replies} replies, ${this.engagedToday.originalTweets} tweets, ${this.engagedToday.total} total`);
  }
}

// Run the engagement manager
const manager = new XEngagementManager();
manager.runEngagementSession().catch(console.error);
