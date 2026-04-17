const path = require('path');
const { resolveKbPath } = require('../utils/config');
const { setupRemote, syncRemote, getGitConfig } = require('../utils/git');

async function remoteSetup(kbPath, remoteUrl) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  if (!remoteUrl) {
    console.log(`请提供Git远程仓库地址:
[1] GitHub私有仓库
[2] 自定义Git地址
[3] 跳过（仅本地使用）

请选择 (1-3) 或直接输入地址:`);
    return;
  }
  
  console.log('✓ 正在配置远程仓库...');
  
  try {
    setupRemote(resolvedPath, remoteUrl);
    console.log(`✓ 远程仓库配置完成
  • 地址: ${remoteUrl}
  • 已推送初始提交`);
  } catch (e) {
    console.log(`❌ 配置失败: ${e.message}

💡 请确保:
  • 已配置Git认证 (SSH密钥或GitHub PAT)
  • 远程仓库已创建`);
  }
}

async function remoteSync(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  console.log('🔄 正在同步远程仓库...');
  
  try {
    syncRemote(resolvedPath);
    console.log('✓ 同步完成');
  } catch (e) {
    console.log(`❌ 同步失败: ${e.message}`);
  }
}

async function remoteStatus(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  const config = getGitConfig(resolvedPath);
  
  console.log(`📋 远程仓库状态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

远程地址: ${config.remote}
Git用户: ${config.user}
Git邮箱: ${config.email}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

/**
 * Main dispatcher for remote subcommands
 */
async function run(kbPath, options) {
  const subcommand = options._ ? options._[0] : undefined;
  
  switch (subcommand) {
    case 'setup':
      return remoteSetup(kbPath, options._[1]);
    
    case 'sync':
      return remoteSync(kbPath);
    
    case 'status':
      return remoteStatus(kbPath);
    
    default:
      return remoteStatus(kbPath);
  }
}

module.exports = {
  run,
  remoteSetup,
  remoteSync,
  remoteStatus
};
