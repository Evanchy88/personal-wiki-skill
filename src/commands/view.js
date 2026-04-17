const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { resolveKbPath } = require('../utils/config');

async function view(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  if (!fs.existsSync(resolvedPath)) {
    console.log('❌ 知识库不存在，请先运行 wiki init');
    return;
  }
  
  console.log(`📂 知识库路径: ${resolvedPath}\n`);
  
  // Detect installed viewers
  const viewers = await detectViewers();
  
  if (viewers.obsidian || viewers.vscode) {
    console.log('检测到已安装的查看工具:');
    if (viewers.obsidian) console.log('  ✓ Obsidian');
    if (viewers.vscode) console.log('  ✓ VS Code');
    console.log('');
  }
  
  console.log(`请选择打开方式:
[1] Obsidian (推荐，支持双向链接和图谱视图)
[2] VS Code (开发者友好)
[3] 文件管理器 (仅浏览文件)
[4] 浏览器预览 (生成HTML页面)

请选择 (1-4):`);
  
  // Default to file manager for now
  openFileManager(resolvedPath);
}

async function detectViewers() {
  const viewers = { obsidian: false, vscode: false };
  
  try {
    if (process.platform === 'win32') {
      try {
        execSync('where obsidian', { stdio: 'pipe' });
        viewers.obsidian = true;
      } catch (e) {}
      
      try {
        execSync('where code', { stdio: 'pipe' });
        viewers.vscode = true;
      } catch (e) {}
    } else if (process.platform === 'darwin') {
      try {
        execSync('mdfind "kMDItemCFBundleIdentifier == md.obsidian"', { stdio: 'pipe' });
        viewers.obsidian = true;
      } catch (e) {}
      
      try {
        execSync('which code', { stdio: 'pipe' });
        viewers.vscode = true;
      } catch (e) {}
    }
  } catch (e) {
    // Ignore detection errors
  }
  
  return viewers;
}

function openObsidian(kbPath) {
  const vaultName = path.basename(kbPath);
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "obsidian://open?vault=${encodeURIComponent(vaultName)}"`, { shell: true });
    } else if (process.platform === 'darwin') {
      execSync(`open -a Obsidian "${kbPath}"`);
    }
    console.log(`✓ Obsidian 已打开`);
  } catch (e) {
    openFileManager(kbPath);
  }
}

function openVSCode(kbPath) {
  try {
    execSync(`code "${kbPath}"`);
    console.log('✓ VS Code 已打开');
  } catch (e) {
    openFileManager(kbPath);
  }
}

function openFileManager(kbPath) {
  try {
    if (process.platform === 'win32') {
      execSync(`explorer "${kbPath}"`);
    } else if (process.platform === 'darwin') {
      execSync(`open "${kbPath}"`);
    } else {
      execSync(`xdg-open "${kbPath}"`);
    }
    console.log('✓ 文件管理器已打开');
  } catch (e) {
    console.log(`📂 请在文件管理器中打开: ${kbPath}`);
  }
}

module.exports = { view, detectViewers, openObsidian, openVSCode, openFileManager };
