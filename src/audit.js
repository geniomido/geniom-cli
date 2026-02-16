const fs = require('fs');
const path = require('path');
const https = require('https');
const chalk = require('chalk');
const ora = require('ora');

// Helper for https get
function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'geniom-cli-audit' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                } else if (res.statusCode === 404) {
                    resolve(null); // Not found
                } else {
                    reject(new Error(`Status ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function runAudit(targetDir = process.cwd()) {
    const pkgPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        console.error(chalk.red(`❌ No package.json found in ${targetDir}`));
        return;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const depNames = Object.keys(deps);

    console.log(chalk.blue(`🔍 Scanning ${depNames.length} dependencies...`));
    
    const spinner = ora('Checking registry...').start();
    let issues = 0;

    for (const dep of depNames) {
        spinner.text = `Checking ${dep}...`;
        try {
            const info = await get(`https://registry.npmjs.org/${dep}`);
            if (!info) {
                spinner.stop();
                console.log(chalk.yellow(`⚠️  ${dep}: Not found in registry (private?)`));
                spinner.start();
                continue;
            }

            const latest = info['dist-tags'].latest;
            const time = info.time[latest];
            const lastUpdate = new Date(time);
            const now = new Date();
            const ageDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);

            // Checks
            if (ageDays > 730) { // 2 years
                spinner.stop();
                console.log(chalk.red(`💀 ${dep}: Abandoned? Last update ${lastUpdate.toISOString().split('T')[0]} (${Math.floor(ageDays)} days ago)`));
                issues++;
                spinner.start();
            }

            // Deprecation check (often in latest version metadata)
            // Ideally we check the version used, but checking latest is a good proxy for project health
            // (TODO: Check specific version)
        } catch (e) {
            // Ignore errors for now
        }
    }

    spinner.stop();
    if (issues === 0) {
        console.log(chalk.green('✨ No graveyards found. Dependencies look fresh.'));
    } else {
        console.log(chalk.yellow(`Found ${issues} potential issues.`));
    }
}

module.exports = { runAudit };
