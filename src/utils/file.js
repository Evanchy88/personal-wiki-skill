const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isSupportedFormat, isMarkdownFile, convertAndSave, SUPPORTED_FORMATS } = require('./convert');

// 支持扫描的所有文件格式
const ALL_SUPPORTED_EXTENSIONS = [
  '.md', '.markdown',  // Markdown
  '.txt',               // 纯文本
  '.pdf',               // PDF
  '.docx',              // Word
  '.pptx',              // PowerPoint
  '.xlsx', '.xls',      // Excel
  '.html', '.htm',      // HTML
  '.epub',              // EPUB 电子书
  '.csv',               // CSV
  '.xml',               // XML
  '.json'               // JSON
];

function scanDirectory(dir, extensions = ALL_SUPPORTED_EXTENSIONS) {
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
    'wiki/methods',      // 学术：方法论
    'wiki/findings',     // 学术：研究发现
    'wiki/events',       // 新闻：事件
    'wiki/techniques',   // 技术：技术方案
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

/**
 * 扫描目录中的非 Markdown 文件并转换为 Markdown
 * 转换后的 .md 文件直接保存到 raw/ 目录，持久化存储
 */
function scanAndConvertDirectory(rawDir, tempDir) {
  if (!fs.existsSync(rawDir)) return { mdFiles: [], converted: 0, skipped: 0, errors: [] };

  const allFiles = scanDirectory(rawDir);
  const mdFiles = [];
  let converted = 0;
  let skipped = 0;
  const errors = [];

  for (const file of allFiles) {
    if (isMarkdownFile(file)) {
      mdFiles.push(file);
      skipped++;
    } else if (isSupportedFormat(file)) {
      try {
        // 转换后的 .md 直接存到 raw/ 目录，与源文件同名
        const convertedPath = convertAndSave(file, rawDir);
        if (convertedPath) {
          mdFiles.push(convertedPath);
          converted++;
        } else {
          errors.push(path.basename(file));
        }
      } catch (e) {
        console.log(`  ❌ 转换失败 ${path.basename(file)}: ${e.message}`);
        errors.push(path.basename(file));
      }
    }
  }

  return { mdFiles, converted, skipped, errors };
}

function cleanConvertedFiles(tempDir) {
  if (!fs.existsSync(tempDir)) return;
  const files = fs.readdirSync(tempDir);
  for (const file of files) {
    if (file.endsWith('.md')) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  }
}

function getSupportedFormats() {
  return { ...SUPPORTED_FORMATS };
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
  extractWikiLinks,
  scanAndConvertDirectory,
  cleanConvertedFiles,
  getSupportedFormats,
  isMarkdownFile,
  isSupportedFormat
};
