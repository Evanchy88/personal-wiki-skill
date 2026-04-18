const path = require('path');
const fs = require('fs');
const { resolveKbPath, loadKbState } = require('../utils/config');
const { readMarkdownFile } = require('../utils/file');

async function qa(kbPath, options = {}) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath(options.path, options);
  const wikiDir = path.join(resolvedPath, 'wiki');
  
  // Get question from options._[0]
  const question = options._ ? options._[0] : undefined;
  if (!question) {
    console.log('❌ 请提供问题');
    console.log('用法: wiki qa "你的问题"');
    return;
  }
  
  if (!fs.existsSync(wikiDir)) {
    console.log('❌ 知识库尚未初始化，请先运行 wiki init');
    return;
  }
  
  console.log('📚 正在从知识库中检索...');
  
  // Search relevant content
  const relevantFiles = searchWiki(wikiDir, question);
  
  if (relevantFiles.length === 0) {
    console.log(`\n❌ 知识库中暂无关于"${question}"的内容。

💡 建议:
• 将相关文章保存到 raw/ 目录
• 运行 wiki compile 编译知识库`);
    return;
  }
  
  console.log(`  • 找到相关文件: ${relevantFiles.length} 篇`);
  
  // Build context
  let context = '';
  for (const file of relevantFiles) {
    const content = readMarkdownFile(file);
    if (content) {
      context += `\n--- ${path.relative(wikiDir, file)} ---\n${content}\n`;
    }
  }
  
  // Output context so AI tool can read wiki content and answer based on it
  console.log('\n💡 基于知识库的回答:\n');
  console.log(context);
  
  console.log('\n📖 参考来源:');
  for (const file of relevantFiles) {
    console.log(`  • ${path.relative(wikiDir, file)}`);
  }
}

function searchWiki(wikiDir, question) {
  const results = [];
  // Split by whitespace for English, but also check individual characters for Chinese
  const keywords = question.toLowerCase().split(/\s+/).filter(kw => kw.length > 0);
  // For Chinese text (no spaces), also add character-level matching
  if (keywords.length === 1 && /[\u4e00-\u9fa5]/.test(question)) {
    // Use meaningful chunks (2-3 characters) for Chinese matching
    const chineseChars = question.toLowerCase().match(/[\u4e00-\u9fa5]/g) || [];
    if (chineseChars.length > 0) {
      keywords.push(...chineseChars);
    }
  }
  
  // Search in index.md
  const indexFile = path.join(wikiDir, 'index.md');
  if (fs.existsSync(indexFile)) {
    const index = fs.readFileSync(indexFile, 'utf-8');
    if (keywords.some(kw => index.toLowerCase().includes(kw))) {
      results.push(indexFile);
    }
  }
  
  // Search in concepts
  const conceptsDir = path.join(wikiDir, 'concepts');
  if (fs.existsSync(conceptsDir)) {
    const files = fs.readdirSync(conceptsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(conceptsDir, file), 'utf-8');
      if (keywords.some(kw => content.toLowerCase().includes(kw))) {
        results.push(path.join(conceptsDir, file));
      }
    }
  }
  
  // Search in summaries
  const summariesDir = path.join(wikiDir, 'summaries');
  if (fs.existsSync(summariesDir)) {
    const files = fs.readdirSync(summariesDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(summariesDir, file), 'utf-8');
      if (keywords.some(kw => content.toLowerCase().includes(kw))) {
        results.push(path.join(summariesDir, file));
      }
    }
  }
  
  return [...new Set(results)];
}

module.exports = { qa, searchWiki };
