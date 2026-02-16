const https = require('https');
const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora');

function fetchRedditData(target, limit = 25) {
    return new Promise((resolve, reject) => {
        // Handle full URL or just subreddit name
        let url;
        if (target.startsWith('http')) {
            // It's a URL, append .json if not present
            url = target.endsWith('.json') ? target : `${target}.json`;
            if (url.includes('?')) url += `&limit=${limit}`;
            else url += `?limit=${limit}`;
        } else {
            // Assume subreddit
            url = `https://www.reddit.com/r/${target}/hot.json?limit=${limit}`;
        }

        const options = {
            headers: {
                'User-Agent': 'Geniom-CLI/1.0' 
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            if (res.statusCode !== 200) {
                reject(new Error(`Status Code: ${res.statusCode}`));
                return;
            }
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Failed to parse JSON."));
                }
            });
        }).on('error', reject);
    });
}

function convertToCSV(items) {
    // Determine if it's a list of posts or comments (Thread view vs Subreddit view)
    // Reddit JSON structure varies.
    // For now, assume Subreddit 'hot' list structure: data.children[].data
    
    const header = ['Title/Body', 'Author', 'Score', 'Comments', 'URL/ID', 'Created (UTC)'];
    const rows = items.map(item => {
        const p = item.data;
        // Title for posts, body for comments
        let content = p.title || p.body || "";
        content = `"${content.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        
        const author = p.author;
        const score = p.score;
        const comments = p.num_comments || 0;
        const url = p.url || p.id;
        const created = new Date(p.created_utc * 1000).toISOString();
        
        return [content, author, score, comments, url, created].join(',');
    });

    return [header.join(','), ...rows].join('\n');
}

async function runRedditExport(target, options) {
    const limit = options.limit || 25;
    const spinner = ora(`Fetching data from ${target}...`).start();

    try {
        const json = await fetchRedditData(target, limit);
        let posts = [];

        // Logic for Subreddit listing
        if (json.data && json.data.children) {
            posts = json.data.children;
        } 
        // Logic for Thread (array of listings: [0]=post, [1]=comments)
        else if (Array.isArray(json) && json.length > 1) {
            // Flatten comments from the second element
            if (json[1].data && json[1].data.children) {
                posts = json[1].data.children;
            }
        }

        spinner.succeed(`Found ${posts.length} items.`);

        if (posts.length === 0) {
            console.log(chalk.yellow("No data found or structure unrecognized."));
            return;
        }

        const csv = convertToCSV(posts);
        const filename = `reddit_export_${Date.now()}.csv`;
        
        fs.writeFileSync(filename, csv);
        console.log(chalk.green(`💾 Saved to ${filename}`));

    } catch (error) {
        spinner.fail(`Error: ${error.message}`);
    }
}

module.exports = { runRedditExport };
