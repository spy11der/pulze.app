/* Run the sync every 8 hours using node-cron */
const cron = require('node-cron');
const path = require('path');
const { spawn } = require('child_process');

console.log('[TM Scheduler] Starting 8-hour schedule...');

cron.schedule('0 */8 * * *', () => {
  const startedAt = new Date().toISOString();
  console.log(`[TM Scheduler] Trigger at ${startedAt}`);
  const child = spawn(process.execPath, [path.join(__dirname, 'sync.js')], {
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    console.log(`[TM Scheduler] Sync finished with code ${code} at ${new Date().toISOString()}`);
  });
});

// Keep process alive
setInterval(() => {}, 1 << 30);
