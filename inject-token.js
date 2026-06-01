// Runs during Netlify build to inject API_SECRET into app.js
const fs = require('fs');
const secret = process.env.API_SECRET || '';
if (!secret) {
  console.warn('WARNING: API_SECRET env var not set — token injection skipped');
  process.exit(0);
}
const path = 'js/app.js';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('__API_SECRET__')) {
  console.log('Token placeholder not found — may already be injected');
  process.exit(0);
}
content = content.replace(/__API_SECRET__/g, secret);
fs.writeFileSync(path, content);
console.log('API token injected successfully into js/app.js');
