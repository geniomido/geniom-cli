#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { runAudit } = require('./src/audit');
const { runRedditExport } = require('./src/reddit');
const { runClean } = require('./src/clean');

const program = new Command();

program
  .name('geniom')
  .description('💎 Geniom CLI - Autonomous Developer Tools')
  .version('1.0.0');

// Command: Audit
program.command('audit')
  .description('Find abandoned and deprecated dependencies')
  .argument('[dir]', 'Directory to scan', process.cwd())
  .action(async (dir) => {
    await runAudit(dir);
  });

// Command: Reddit
program.command('reddit')
  .description('Export Reddit threads or subreddits to CSV')
  .argument('<target>', 'Subreddit name (e.g. "programming") or Thread URL')
  .option('-l, --limit <number>', 'Number of posts to fetch', 25)
  .action(async (target, options) => {
    await runRedditExport(target, options);
  });

// Command: Clean
program.command('clean')
  .description('Clean AI-generated code artifacts')
  .argument('<file>', 'File to clean')
  .option('-i, --inplace', 'Overwrite file', false)
  .action((file, options) => {
    runClean(file, options);
  });

program.parse();
