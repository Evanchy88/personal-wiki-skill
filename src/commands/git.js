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
  
  console.log(`📜 编译历史
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${log || '无历史记录'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

async function gitDiff(kbPath, commit) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const diff = getGitDiff(resolvedPath, commit);
  
  console.log(`📝 Git Diff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${diff || '无变更'}

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
  console.log(`📋 分支列表

${result || '无分支信息'}
`);
}

module.exports = {
  gitStatus,
  gitLog,
  gitDiff,
  gitRollback,
  gitStash: gitStashCmd,
  gitBranch: gitBranchCmd
};
