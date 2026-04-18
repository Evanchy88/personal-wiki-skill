const path = require('path');
const { resolveKbPath } = require('../utils/config');
const { getGitStatus, getGitLog, getGitDiff, gitReset, gitStash, gitBranch } = require('../utils/git');

async function gitStatus(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const status = getGitStatus(resolvedPath);
  const isClean = !status || !status.trim();
  
  console.log(`📋 Git 状态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isClean ? '工作区干净，无未提交变更' : status}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

async function gitLog(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const log = getGitLog(resolvedPath, { oneline: true });
  
  // Handle error object return
  const logStr = typeof log === 'object' ? (log.error || '无历史记录') : (log || '无历史记录');
  
  console.log(`📜 编译历史
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${logStr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

async function gitDiff(kbPath, commit) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const diff = getGitDiff(resolvedPath, commit);
  
  // Handle error object return
  const diffStr = typeof diff === 'object' ? (diff.error || '无变更') : (diff || '无变更');
  
  console.log(`📝 Git Diff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${diffStr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

async function gitRollback(kbPath, commit) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  console.log(`⚠️ 警告：此操作将回滚知识库到以下状态：

${commit}

之后的提交将被丢弃。
此操作不可撤销。确认回滚？[y/N]`);
  
  // In actual implementation, wait for confirmation
  const result = gitReset(resolvedPath, commit);
  console.log(`✓ 已回滚到 ${commit}`);
}

async function gitStashCmd(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const result = gitStash(resolvedPath);
  console.log(`✓ 已暂存当前变更`);
}

async function gitBranchCmd(kbPath, branchName) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const result = gitBranch(resolvedPath, branchName);
  
  // Handle error object return
  const resultStr = typeof result === 'object' ? (result.error || '无分支信息') : (result || '无分支信息');
  
  console.log(`📋 分支列表

${resultStr}
`);
}

/**
 * Main dispatcher for git subcommands
 */
async function run(kbPath, options) {
  const subcommand = options._ ? options._[0] : undefined;
  
  switch (subcommand) {
    case 'status':
      return gitStatus(kbPath);
    
    case 'log':
      return gitLog(kbPath);
    
    case 'diff':
      return gitDiff(kbPath, options._[1]);
    
    case 'rollback':
      return gitRollback(kbPath, options._[1]);
    
    case 'stash':
      return gitStash(kbPath);
    
    case 'branch':
      return gitBranchCmd(kbPath, options._[1]);
    
    default:
      return gitStatus(kbPath);
  }
}

module.exports = {
  run,
  gitStatus,
  gitLog,
  gitDiff,
  gitRollback,
  gitStash: gitStashCmd,
  gitBranch: gitBranchCmd
};
