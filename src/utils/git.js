const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function runGitCommand(command, cwd) {
  try {
    return execSync(command, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (error) {
    return { error: error.message, stderr: error.stderr, stdout: error.stdout };
  }
}

function initGitRepo(kbPath) {
  const gitignore = `# Node modules
node_modules/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log

# Temp files
*.tmp
.cache/
`;

  runGitCommand('git init', kbPath);
  fs.writeFileSync(path.join(kbPath, '.gitignore'), gitignore);
  runGitCommand('git add .', kbPath);
  
  // 检查是否配置了 git 身份
  const userName = runGitCommand('git config user.name', kbPath);
  const userEmail = runGitCommand('git config user.email', kbPath);
  
  if (!userName?.trim() || !userEmail?.trim()) {
    // 未配置身份，使用临时身份进行本地提交
    runGitCommand('git -c user.name="wiki-user" -c user.email="wiki@local" commit -m "wiki: initialize knowledge base"', kbPath);
  } else {
    // 已配置身份，正常提交
    runGitCommand('git commit -m "wiki: initialize knowledge base"', kbPath);
  }
}

function getGitStatus(kbPath) {
  return runGitCommand('git status --porcelain', kbPath);
}

function getGitLog(kbPath, options = {}) {
  const format = options.oneline ? '--oneline' : '';
  return runGitCommand(`git log ${format} --graph --decorate -20`, kbPath);
}

function getGitDiff(kbPath, commit) {
  if (commit) {
    return runGitCommand(`git diff ${commit}^ ${commit}`, kbPath);
  }
  return runGitCommand('git diff HEAD', kbPath);
}

function gitAdd(files, kbPath) {
  if (typeof files === 'string') files = [files];
  return runGitCommand(`git add ${files.join(' ')}`, kbPath);
}

function gitCommit(kbPath, message) {
  // 检查是否配置了 git 身份
  const userName = runGitCommand('git config user.name', kbPath);
  const userEmail = runGitCommand('git config user.email', kbPath);
  
  if (!userName?.trim() || !userEmail?.trim()) {
    // 未配置身份，使用临时身份提交
    return runGitCommand(`git -c user.name="wiki-user" -c user.email="wiki@local" commit -m "${message}"`, kbPath);
  } else {
    return runGitCommand(`git commit -m "${message}"`, kbPath);
  }
}

function gitReset(kbPath, commit) {
  return runGitCommand(`git reset --hard ${commit}`, kbPath);
}

function gitStash(kbPath) {
  return runGitCommand('git stash', kbPath);
}

function gitBranch(kbPath, branchName) {
  if (branchName) {
    return runGitCommand(`git branch ${branchName}`, kbPath);
  }
  return runGitCommand('git branch -a', kbPath);
}

function setupRemote(kbPath, remoteUrl) {
  const existing = runGitCommand('git remote -v', kbPath);
  if (existing && existing.includes('origin')) {
    runGitCommand(`git remote set-url origin ${remoteUrl}`, kbPath);
  } else {
    runGitCommand(`git remote add origin ${remoteUrl}`, kbPath);
  }
  return runGitCommand('git push -u origin main', kbPath);
}

function syncRemote(kbPath) {
  runGitCommand('git pull origin main', kbPath);
  return runGitCommand('git push origin main', kbPath);
}

function autoCommitWiki(kbPath, message) {
  gitAdd(['wiki/', '.kb-state.json'], kbPath);
  const status = getGitStatus(kbPath);
  if (status && status.trim()) {
    return gitCommit(kbPath, message);
  }
  return 'Nothing to commit.';
}

function getGitConfig(kbPath) {
  const user = runGitCommand('git config user.name', kbPath);
  const email = runGitCommand('git config user.email', kbPath);
  const remote = runGitCommand('git remote get-url origin 2>/dev/null || echo "none"', kbPath);
  
  return {
    user: user?.trim() || 'Not configured',
    email: email?.trim() || 'Not configured',
    remote: remote?.trim() || 'none'
  };
}

module.exports = {
  initGitRepo,
  getGitStatus,
  getGitLog,
  getGitDiff,
  gitAdd,
  gitCommit,
  gitReset,
  gitStash,
  gitBranch,
  setupRemote,
  syncRemote,
  autoCommitWiki,
  getGitConfig,
  runGitCommand
};
