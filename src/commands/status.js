const path = require('path');
const fs = require('fs');
const { resolveKbPath, loadKbState } = require('../utils/config');
const { scanDirectory } = require('../utils/file');
const { getGitStatus, getGitConfig } = require('../utils/git');

async function status(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  const rawDir = path.join(resolvedPath, 'raw');
  const wikiDir = path.join(resolvedPath, 'wiki');
  const state = loadKbState(resolvedPath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.log('❌ 知识库不存在，请先运行 wiki init');
    return;
  }
  
  // Count files
  const rawFiles = scanDirectory(rawDir);
  const wikiStats = countWikiFiles(wikiDir);
  
  // Count pending changes
  let pendingChanges = 0;
  for (const file of rawFiles) {
    const relPath = path.relative(resolvedPath, file);
    if (!state.files[relPath]) {
      pendingChanges++;
    }
  }
  
  const gitStatus = getGitStatus(resolvedPath);
  const isClean = !gitStatus || !gitStatus.trim();
  
  console.log(`📊 知识库状态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 路径: ${resolvedPath}

📥 raw/ 目录
  • 文件数: ${rawFiles.length} 个
  • 总大小: ${(rawFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0) / 1024 / 1024).toFixed(1)}MB
${rawFiles.length > 0 ? `  • 最新文件: ${path.basename(rawFiles[rawFiles.length - 1])}` : ''}

📤 wiki/ 目录
  • 摘要: ${wikiStats.summaries} 篇
  • 概念: ${wikiStats.concepts} 个
  • 人物: ${wikiStats.people} 个
  • 主题: ${wikiStats.topics} 个
  • 总链接: ${wikiStats.links} 条

🔄 编译状态
  • 最后编译: ${state.lastCompile ? new Date(state.lastCompile).toLocaleString() : '从未编译'}
  • 待处理变更: ${pendingChanges} 个新文件
  • Git状态: ${isClean ? '干净 (无未提交变更)' : '有未提交变更'}

💡 提示
  • 运行 wiki compile 编译新文件
  • 运行 wiki lint 检查知识库质量

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function countWikiFiles(wikiDir) {
  const stats = { summaries: 0, concepts: 0, people: 0, topics: 0, links: 0 };
  
  const dirs = {
    summaries: path.join(wikiDir, 'summaries'),
    concepts: path.join(wikiDir, 'concepts'),
    people: path.join(wikiDir, 'people'),
    topics: path.join(wikiDir, 'topics')
  };
  
  for (const [key, dir] of Object.entries(dirs)) {
    if (fs.existsSync(dir)) {
      stats[key] = fs.readdirSync(dir).filter(f => f.endsWith('.md')).length;
    }
  }
  
  // Count links in index.md
  const indexFile = path.join(wikiDir, 'index.md');
  if (fs.existsSync(indexFile)) {
    const content = fs.readFileSync(indexFile, 'utf-8');
    const links = content.match(/\[\[([^\]]+)\]\]/g);
    stats.links = links ? links.length : 0;
  }
  
  return stats;
}

module.exports = { status };
