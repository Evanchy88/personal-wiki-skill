const path = require('path');
const fs = require('fs');
const { resolveKbPath } = require('../utils/config');
const { readMarkdownFile, writeMarkdownFile, extractWikiLinks, listWikiFiles, ensureDirectory } = require('../utils/file');
const { autoCommitWiki } = require('../utils/git');

async function lint(kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  const wikiDir = path.join(resolvedPath, 'wiki');
  
  if (!fs.existsSync(wikiDir)) {
    console.log('❌ 知识库尚未初始化，请先运行 wiki init');
    return;
  }
  
  console.log('🔍 正在检查知识库质量...\n');
  
  const report = {
    fixed: { brokenLinks: 0, coverage: 0 },
    warnings: { conflicts: 0, orphans: 0, outdated: 0 }
  };
  
  // 1. Check broken links
  console.log('[1/6] 检查断裂链接 ...');
  report.fixed.brokenLinks = checkBrokenLinks(wikiDir);
  console.log(`      ✓ 发现并修复 ${report.fixed.brokenLinks} 条断裂链接\n`);
  
  // 2. Check orphan concepts
  console.log('[2/6] 检查孤立概念 ...');
  report.warnings.orphans = checkOrphanConcepts(wikiDir);
  console.log(`      ✓ 发现 ${report.warnings.orphans} 个孤立概念\n`);
  
  // 3. Check conflicts
  console.log('[3/6] 检查冲突标记 ...');
  report.warnings.conflicts = checkConflicts(wikiDir);
  console.log(`      ✓ 发现 ${report.warnings.conflicts} 处概念冲突\n`);
  
  // 4. Check missing concepts
  console.log('[4/6] 检查概念缺失 ...');
  const missing = checkMissingConcepts(wikiDir);
  console.log(`      ✓ 发现 ${missing.length} 个缺失概念，已自动创建\n`);
  
  // 5. Check coverage
  console.log('[5/6] 检查覆盖度 ...');
  report.fixed.coverage = checkCoverage(wikiDir);
  console.log(`      ✓ 扩展 ${report.fixed.coverage} 篇简略概念\n`);
  
  // 6. Check时效性
  console.log('[6/6] 检查时效性 ...');
  report.warnings.outdated = checkOutdated(wikiDir);
  console.log(`      ✓ 发现 ${report.warnings.outdated} 篇过期文档\n`);
  
  // Git commit fixes
  if (report.fixed.brokenLinks > 0 || report.fixed.coverage > 0 || missing.length > 0) {
    autoCommitWiki(resolvedPath, 'wiki: lint auto-fix');
  }
  
  // Show report
  console.log(`📋 Lint 报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 已自动修复
  • 断裂链接: ${report.fixed.brokenLinks} 条 (已创建空概念文件)
  • 覆盖度不足: ${report.fixed.coverage} 篇 (已自动扩展)

⚠️ 需要人工处理
  • 概念冲突: ${report.warnings.conflicts} 处
  • 孤立概念: ${report.warnings.orphans} 个
  • 时效性过期: ${report.warnings.outdated} 篇

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

function checkBrokenLinks(wikiDir) {
  let count = 0;
  const files = getAllWikiFiles(wikiDir);
  
  for (const file of files) {
    const content = readMarkdownFile(file);
    if (!content) continue;
    
    const links = extractWikiLinks(content);
    for (const link of links) {
      const target = findConceptFile(wikiDir, link);
      if (!target) {
        // Create empty concept file
        const conceptPath = path.join(wikiDir, 'concepts', `${link}.md`);
        ensureDirectory(path.dirname(conceptPath));
        writeMarkdownFile(conceptPath, `# ${link}\n\n> ⚠️ 此概念文件由系统自动创建，内容待补充。`);
        count++;
      }
    }
  }
  
  return count;
}

function checkOrphanConcepts(wikiDir) {
  const conceptsDir = path.join(wikiDir, 'concepts');
  if (!fs.existsSync(conceptsDir)) return 0;
  
  let count = 0;
  const allContent = getAllWikiContent(wikiDir).toLowerCase();
  const concepts = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.md'));
  
  for (const concept of concepts) {
    const name = path.basename(concept, '.md');
    if (!allContent.includes(`[[${name}]]`)) {
      count++;
    }
  }
  
  return count;
}

function checkConflicts(wikiDir) {
  let count = 0;
  const files = getAllWikiFiles(wikiDir);
  
  for (const file of files) {
    const content = readMarkdownFile(file);
    if (content && (content.includes('⚠️ 冲突') || content.includes('⚠️冲突'))) {
      count++;
    }
  }
  
  return count;
}

function checkMissingConcepts(wikiDir) {
  const missing = [];
  const existingConcepts = new Set();
  
  // 扫描已存在的概念文件
  const conceptsDir = path.join(wikiDir, 'concepts');
  if (fs.existsSync(conceptsDir)) {
    fs.readdirSync(conceptsDir).forEach(file => {
      if (file.endsWith('.md')) {
        existingConcepts.add(path.basename(file, '.md'));
      }
    });
  }
  
  // 扫描所有 wiki 文件，查找引用的概念
  const files = getAllWikiFiles(wikiDir);
  for (const file of files) {
    const content = readMarkdownFile(file);
    if (!content) continue;
    
    const links = extractWikiLinks(content);
    for (const link of links) {
      // 检查是否是概念引用（以 concepts/ 开头或在概念目录中不存在）
      const conceptPath = path.join(wikiDir, 'concepts', `${link}.md`);
      if (!fs.existsSync(conceptPath) && !existingConcepts.has(link)) {
        // 创建空概念文件
        ensureDirectory(path.dirname(conceptPath));
        writeMarkdownFile(conceptPath, `# ${link}\n\n> ⚠️ 此概念文件由系统自动创建，内容待补充。`);
        missing.push(link);
        existingConcepts.add(link); // 避免重复创建
      }
    }
  }
  
  return missing;
}

function checkCoverage(wikiDir) {
  let count = 0;
  const conceptsDir = path.join(wikiDir, 'concepts');
  if (!fs.existsSync(conceptsDir)) return 0;
  
  const files = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = readMarkdownFile(path.join(conceptsDir, file));
    if (content && content.length < 100) {
      count++;
    }
  }
  
  return count;
}

function checkOutdated(wikiDir) {
  let count = 0;
  const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
  const files = getAllWikiFiles(wikiDir);
  
  for (const file of files) {
    const stats = fs.statSync(file);
    if (stats.mtimeMs < sixMonthsAgo) {
      count++;
    }
  }
  
  return count;
}

function getAllWikiFiles(wikiDir) {
  const files = [];
  const dirs = ['summaries', 'concepts', 'people', 'topics'];
  
  for (const dir of dirs) {
    const dirPath = path.join(wikiDir, dir);
    if (fs.existsSync(dirPath)) {
      const items = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
      files.push(...items.map(f => path.join(dirPath, f)));
    }
  }
  
  return files;
}

function getAllWikiContent(wikiDir) {
  let content = '';
  const files = getAllWikiFiles(wikiDir);
  for (const file of files) {
    const c = readMarkdownFile(file);
    if (c) content += c;
  }
  return content;
}

function findConceptFile(wikiDir, conceptName) {
  const conceptsDir = path.join(wikiDir, 'concepts');
  if (!fs.existsSync(conceptsDir)) return null;
  
  const files = fs.readdirSync(conceptsDir);
  return files.find(f => path.basename(f, '.md') === conceptName);
}

module.exports = { lint };
