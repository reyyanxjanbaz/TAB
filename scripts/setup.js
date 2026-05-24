#!/usr/bin/env node
// TAB setup script — copies .env.example to .env if missing, generates VAPID keys
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const envPath = path.join(root, 'server', '.env');
const envExample = path.join(root, '.env.example');

if (!fs.existsSync(envPath)) {
  let env = fs.readFileSync(envExample, 'utf8');

  // Generate VAPID keys
  try {
    const result = execSync('npx web-push generate-vapid-keys --json', {
      cwd: path.join(root, 'server'),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const keys = JSON.parse(result);
    env = env
      .replace('VAPID_PUBLIC_KEY=', `VAPID_PUBLIC_KEY=${keys.publicKey}`)
      .replace('VAPID_PRIVATE_KEY=', `VAPID_PRIVATE_KEY=${keys.privateKey}`);
    console.log('✓ Generated VAPID keys');
  } catch {
    console.log('⚠  Could not auto-generate VAPID keys. Fill them in server/.env manually.');
    console.log('  Run: cd server && npx web-push generate-vapid-keys');
  }

  // Generate JWT secret
  const secret = require('crypto').randomBytes(48).toString('hex');
  env = env.replace('change_this_to_a_long_random_secret', secret);

  fs.writeFileSync(envPath, env);
  console.log('✓ Created server/.env');
} else {
  console.log('  server/.env already exists, skipping');
}

// Generate icons
require('./generate-icons');

console.log('\n✅ Setup complete!');
console.log('\n  Install dependencies:');
console.log('    npm run install:all');
console.log('\n  Start dev servers:');
console.log('    npm run dev\n');
