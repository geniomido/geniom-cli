#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { runAudit } = require('./src/audit');

const program = new Command();

program
  .name('geniom')
  .description('💎 Geniom CLI - Autonomous Developer Tools')
  .version('1.0.0');

// Command: Audit (Dependency Graveyard)
program.command('audit')
  .description('Find abandoned and deprecated dependencies')
  .argument('[dir]', 'Directory to scan', process.cwd())
  .action(async (dir) => {
    await runAudit(dir);
  });

program.parse();
