/**
 * Personal Wiki - Main Entry Point
 * 
 * A personal knowledge base skill inspired by Karpathy's method.
 * Collect raw articles, let LLM compile them into structured wiki.
 * 
 * Usage:
 *   In your AI coding tool, use commands like:
 *   - wiki init
 *   - wiki compile
 *   - wiki clean <file>
 *   - wiki lint
 *   - wiki qa "question"
 *   - wiki status
 *   - wiki view
 *   - wiki git <subcommand>
 *   - wiki remote <subcommand>
 */

const path = require('path');

// Utility modules
const config = require('./src/utils/config');
const fileUtils = require('./src/utils/file');
const gitUtils = require('./src/utils/git');
const llmUtils = require('./src/utils/llm');

// Command modules
const initCmd = require('./src/commands/init');
const compileCmd = require('./src/commands/compile');
const cleanCmd = require('./src/commands/clean');
const lintCmd = require('./src/commands/lint');
const qaCmd = require('./src/commands/qa');
const statusCmd = require('./src/commands/status');
const viewCmd = require('./src/commands/view');
const gitCmd = require('./src/commands/git');
const remoteCmd = require('./src/commands/remote');
const kbCmd = require('./src/commands/kb');

/**
 * Main command handler
 * @param {string} command - Command name
 * @param {object} options - Command options
 * @returns {Promise<any>}
 */
async function main(command, options = {}) {
  // KB management commands don't need kbPath resolution
  if (command === 'kb' || command === 'list' || command === 'add' || command === 'switch' || command === 'remove') {
    return kbCmd.run(null, options);
  }

  const kbPath = config.resolveKbPath(options.path, options);

  switch (command) {
    case 'init':
      return initCmd.run(kbPath, options);
    
    case 'compile':
      return compileCmd.run(kbPath, options);
    
    case 'clean':
      return cleanCmd.run(kbPath, options);
    
    case 'lint':
      return lintCmd.run(kbPath, options);
    
    case 'qa':
      return qaCmd.run(kbPath, options);
    
    case 'status':
      return statusCmd.run(kbPath, options);
    
    case 'view':
      return viewCmd.run(kbPath, options);
    
    case 'git':
      return gitCmd.run(kbPath, options);
    
    case 'remote':
      return remoteCmd.run(kbPath, options);
    
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Available commands: init, compile, clean, lint, qa, status, view, git, remote, kb');
      process.exit(1);
  }
}

// Export all modules
module.exports = {
  main,
  config,
  fileUtils,
  gitUtils,
  llmUtils,
  commands: {
    init: initCmd,
    compile: compileCmd,
    clean: cleanCmd,
    lint: lintCmd,
    qa: qaCmd,
    status: statusCmd,
    view: viewCmd,
    git: gitCmd,
    remote: remoteCmd,
    kb: kbCmd
  }
};

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log('Personal Wiki - Build your knowledge base with LLM');
    console.log('');
    console.log('Usage: node index.js <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  init              Initialize a new knowledge base');
    console.log('  compile           Compile raw articles into wiki');
    console.log('  clean <file>      Clean dirty content from file(s)');
    console.log('  lint              Check wiki quality and auto-fix');
    console.log('  qa "question"     Ask questions based on wiki');
    console.log('  status            Show knowledge base statistics');
    console.log('  view              Open knowledge base viewer');
    console.log('  git <subcommand>  Git operations');
    console.log('  remote <subcommand> Remote repository operations');
    console.log('  kb list           List all registered knowledge bases');
    console.log('  kb add <n> <p>    Register a knowledge base');
    console.log('  kb switch <name>  Switch default knowledge base');
    console.log('  kb remove <name>  Remove a knowledge base');
    console.log('');
    console.log('Multi-KB:');
    console.log('  wiki compile --kb ai-notes    Target a specific KB');
    console.log('  wiki qa --kb notes "question" Ask from a specific KB');
    process.exit(0);
  }

  // Parse options from remaining args
  const options = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      options._ = options._ || [];
      options._.push(arg);
    }
  }

  main(command, options).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
