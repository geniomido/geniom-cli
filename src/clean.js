const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function cleanContent(content) {
    let lines = content.split('\n');
    let cleanedLines = [];
    let removedCount = 0;

    // Regex for common AI explanations
    const aiPatterns = [
        /^\/\/ Here is the updated code/,
        /^\/\/ I have fixed the issues/,
        /^\/\/ This function does/,
        /^\/\/ Note:/,
        /^\*\*Here is the code:\*\*/
    ];

    // Regex for markdown code blocks
    const codeBlockPattern = /^```/;

    for (let line of lines) {
        let keep = true;

        // Check for Markdown blocks
        if (codeBlockPattern.test(line)) {
            keep = false;
            removedCount++;
        }

        // Check for AI chatter comments
        // Only removing single line comments that look like explanations, not valid code comments
        // This is a heuristic and might be aggressive
        if (keep) {
            for (const pattern of aiPatterns) {
                if (pattern.test(line.trim())) {
                    keep = false;
                    removedCount++;
                    break;
                }
            }
        }

        if (keep) {
            cleanedLines.push(line);
        }
    }

    // Trim leading/trailing empty lines
    while (cleanedLines.length > 0 && cleanedLines[0].trim() === '') cleanedLines.shift();
    while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') cleanedLines.pop();

    return { content: cleanedLines.join('\n'), removedCount };
}

function runClean(target, options) {
    if (!fs.existsSync(target)) {
        console.error(chalk.red(`❌ File not found: ${target}`));
        return;
    }

    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
        // TODO: Recursive directory support
        console.log(chalk.yellow("Directory support coming soon. Please specify a file."));
        return;
    }

    console.log(chalk.blue(`🧹 Cleaning ${target}...`));
    
    const content = fs.readFileSync(target, 'utf8');
    const result = cleanContent(content);

    if (result.removedCount > 0) {
        if (options.inplace) {
            fs.writeFileSync(target, result.content);
            console.log(chalk.green(`✨ Cleaned ${result.removedCount} lines (Markdown/AI chatter). File updated.`));
        } else {
            console.log(result.content);
            console.error(chalk.green(`\n✨ Removed ${result.removedCount} lines. (Use --inplace to overwrite file)`));
        }
    } else {
        console.log(chalk.green("✨ File looks clean already."));
    }
}

module.exports = { runClean };
