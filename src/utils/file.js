const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function scanDirectory(dir, extensions = ['.md', '.txt']) {
  if (!fs.existsSync(dir)) return [];
  
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'images') {
        files.push(...scanDirectory(fullPath, extensions));
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function computeHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function getFileStats(filePath) {
  const stats = fs.statSync(filePath);
  return {
    mtime: stats.mtimeMs,
    size: stats.size,
    hash: computeHash(filePath)
  };
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function initWikiStructure(kbPath) {
  const dirs = [
    'raw',
    'raw/images',
    'wiki',
    'wiki/summaries',
    'wiki/concepts',
    'wiki/people',
    'wiki/topics',
    'images'
  ];
  
  for (const dir of dirs) {
    ensureDirectory(path.join(kbPath, dir));
  }
}

function readMarkdownFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function writeMarkdownFile(filePath, content) {
  const dir = path.dirname(filePath);
  ensureDirectory(dir);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function detectDirtyContent(content) {
  const dirtySignals = [
    /nav\s*=/i,
    /cookie\s*consent/i,
    /share\s*this|share\s*on/i,
    /<aside|<footer|<header/i,
    /广告|推广|赞助/i,
    /点击此处下载|立即下载/i,
    /关注公众号|扫码关注/i
  ];
  
  return dirtySignals.some(re => re.test(content));
}

function listWikiFiles(wikiDir, subDir = null) {
  const targetDir = subDir ? path.join(wikiDir, subDir) : wikiDir;
  if (!fs.existsSync(targetDir)) return [];
  
  return fs.readdirSync(targetDir, { withFileTypes: true })
    .filter(f => f.isFile() && f.name.endsWith('.md'))
    .map(f => subDir ? path.join(subDir, f.name) : f.name);
}

function extractWikiLinks(content) {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  
  return [...new Set(links)];
}

module.exports = {
  scanDirectory,
  computeHash,
  getFileStats,
  ensureDirectory,
  initWikiStructure,
  readMarkdownFile,
  writeMarkdownFile,
  detectDirtyContent,
  listWikiFiles,
  extractWikiLinks
};
