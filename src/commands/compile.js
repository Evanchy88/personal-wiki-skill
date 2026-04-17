const path = require('path');
const fs = require('fs');
const { resolveKbPath, loadKbState, saveKbState } = require('../utils/config');
const { scanDirectory, computeHash, getFileStats, detectDirtyContent, readMarkdownFile, writeMarkdownFile, extractWikiLinks } = require('../utils/file');
const { autoCommitWiki } = require('../utils/git');
const { loadPrompt, fillPrompt, callLLM } = require('../utils/llm');

async function compile(kbPath, options = {}) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath(options.path, options);
  const rawDir = path.join(resolvedPath, 'raw');
  const wikiDir = path.join(resolvedPath, 'wiki');
  const summariesDir = path.join(wikiDir, 'summaries');
  const conceptsDir = path.join(wikiDir, 'concepts');
  const peopleDir = path.join(wikiDir, 'people');
  const topicsDir = path.join(wikiDir, 'topics');
  const promptsDir = path.join(__dirname, '../../prompts');

  [wikiDir, summariesDir, conceptsDir, peopleDir, topicsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const state = loadKbState(resolvedPath);
  const rawFiles = scanDirectory(rawDir);
  if (rawFiles.length === 0) {
    console.log('❌ raw/ 目录为空，请先添加一些文章');
    return;
  }

  const changes = { added: [], modified: [], deleted: [], unchanged: [] };

  for (const file of rawFiles) {
    const relPath = path.relative(resolvedPath, file);
    const record = state.files[relPath];
    const stats = getFileStats(file);
    if (!record) changes.added.push({ file, relPath, stats });
    else if (record.hash !== stats.hash) changes.modified.push({ file, relPath, stats, oldRecord: record });
    else changes.unchanged.push({ file, relPath });
  }

  for (const [relPath, record] of Object.entries(state.files)) {
    const absPath = path.join(resolvedPath, relPath);
    if (!fs.existsSync(absPath)) changes.deleted.push({ relPath, record });
  }

  const totalChanges = changes.added.length + changes.modified.length + changes.deleted.length;
  if (totalChanges === 0) {
    console.log('✓ 未检测到变更，知识库已是最新。');
    return;
  }

  console.log(`📊 准备编译知识库...\n\n扫描 raw/ 目录...\n✓ 发现 ${rawFiles.length} 个文件\n  • 新增: ${changes.added.length} 个\n  • 修改: ${changes.modified.length} 个\n  • 未变: ${changes.unchanged.length} 个\n  • 删除: ${changes.deleted.length} 个\n\n📋 待处理文件:`);

  const toProcess = [...changes.added, ...changes.modified];
  toProcess.forEach((item, i) => {
    const status = changes.added.includes(item) ? '新增' : '修改';
    console.log(`  ${i + 1}. ${path.basename(item.relPath)} (${status}, ${(item.stats.size / 1024).toFixed(0)}KB)`);
  });

  const estimatedTime = Math.max(1, Math.ceil(toProcess.length * 2));
  console.log(`\n⏱️ 预计时间: ${estimatedTime}-${estimatedTime * 2} 分钟（四阶段编译）`);
  console.log('📝 编译模式: 提取概念 → 撰写摘要 → 深入概念 → 主题聚合\n');

  const report = { processed: 0, concepts: 0, people: 0, topics: 0, links: 0, cleaned: 0, issues: [] };

  // Track all extracted concepts for topic aggregation
  const allConcepts = [];
  const allSummaries = [];

  for (const item of toProcess) {
    const idx = toProcess.indexOf(item) + 1;
    const filename = path.basename(item.file, path.extname(item.file));
    console.log(`\n[${idx}/${toProcess.length}] 研读 ${filename}...`);

    let content = readMarkdownFile(item.file);

    if (detectDirtyContent(content)) {
      console.log('  🧹 检测到脏数据，正在清洗...');
      try {
        const cleanTemplate = loadPrompt('clean', promptsDir);
        if (cleanTemplate) {
          const cleanPrompt = fillPrompt(cleanTemplate, { content });
          const cleanResult = await callLLM(cleanPrompt);
          content = cleanResult.content || content;
          report.cleaned++;
          console.log('  ✓ 清洗完成');
        }
      } catch (e) {
        console.log(`  ⚠️ 清洗失败: ${e.message}`);
      }
    }

    try {
      // Phase 1: Extract concepts
      console.log('  [1/4] 提取概念和人物...');
      const extractTemplate = loadPrompt('compile', promptsDir);
      const extractPrompt = fillPrompt(extractTemplate, { filePath: item.relPath, fileContent: content });
      const extractResult = await callLLM(extractPrompt);
      const extractJson = parseJsonFromLlmOutput(extractResult.content || extractResult);

      const concepts = extractJson.concepts || [];
      const people = extractJson.people || [];
      const topics = extractJson.topics || [];
      console.log(`    ✓ 识别 ${concepts.length} 个概念, ${people.length} 个人物`);

      // Track concepts for later topic aggregation
      concepts.forEach(c => {
        if (!allConcepts.find(ac => ac.name === c.name)) {
          allConcepts.push({ ...c, sourceFile: filename });
        }
      });

      // Phase 2: Generate summary
      console.log('  [2/4] 生成文章摘要...');
      const summaryTemplate = loadPrompt('summary', promptsDir);
      const summaryPrompt = fillPrompt(summaryTemplate, {
        filePath: item.relPath,
        fileContent: content,
        conceptsJson: JSON.stringify(extractJson, null, 2),
        title: extractJson.title || filename,
        author: extractJson.author || '未知',
        date: new Date().toISOString().split('T')[0]
      });
      const summaryResult = await callLLM(summaryPrompt);
      const summaryContent = summaryResult.content || summaryResult;
      const summaryPath = path.join(summariesDir, `${filename}.md`);
      writeMarkdownFile(summaryPath, summaryContent);
      allSummaries.push({ filename, title: extractJson.title || filename, content: summaryContent });
      console.log(`    ✓ 生成摘要: ${summaryContent.length} 字`);

      // Phase 3: Generate detailed concept files
      console.log('  [3/4] 撰写概念详细条目...');
      const conceptTemplate = loadPrompt('concept', promptsDir);
      for (const concept of concepts) {
        const safeName = concept.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
        const conceptPrompt = fillPrompt(conceptTemplate, {
          conceptName: concept.name,
          conceptBrief: concept.brief,
          sourceFile: item.relPath,
          fileContent: content,
          sourceFilename: filename
        });
        const conceptResult = await callLLM(conceptPrompt);
        const conceptContent = conceptResult.content || conceptResult;
        writeMarkdownFile(path.join(conceptsDir, `${safeName}.md`), conceptContent);
        report.concepts++;
        console.log(`    ✓ 概念: ${concept.name} (${conceptContent.length} 字)`);
      }

      // Generate detailed people files
      console.log('  [3/4] 撰写人物详细条目...');
      const personTemplate = loadPrompt('person', promptsDir);
      for (const person of people) {
        const safeName = person.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_\-. ]/g, '_');
        const personPrompt = fillPrompt(personTemplate, {
          personName: person.name,
          personRole: person.role,
          sourceFile: item.relPath,
          fileContent: content,
          sourceFilename: filename
        });
        const personResult = await callLLM(personPrompt);
        const personContent = personResult.content || personResult;
        writeMarkdownFile(path.join(peopleDir, `${safeName}.md`), personContent);
        report.people++;
        console.log(`    ✓ 人物: ${person.name} (${personContent.length} 字)`);
      }

      report.links += extractWikiLinks(summaryContent).length;
      report.processed++;

      state.files[item.relPath] = {
        mtime: item.stats.mtime,
        hash: item.stats.hash,
        size: item.stats.size,
        compiled: true,
        wikiRefs: [
          `wiki/summaries/${filename}.md`,
          ...concepts.map(c => `wiki/concepts/${c.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_')}.md`),
          ...people.map(p => `wiki/people/${p.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_\-. ]/g, '_')}.md`)
        ]
      };
    } catch (e) {
      console.log(`  ❌ 编译失败: ${e.message}`);
      report.issues.push({ file: filename, error: e.message });
    }
  }

  // Phase 4: Topic aggregation (runs once after all articles processed)
  if (allConcepts.length > 0) {
    console.log('\n[4/4] 主题聚类与聚合页生成...');
    try {
      const topicsTemplate = loadPrompt('topics', promptsDir);
      const summariesListStr = allSummaries.map(s => `- ${s.filename}: ${s.title}`).join('\n');
      const conceptsListStr = allConcepts.map(c => `- ${c.name}: ${c.brief} (来源: ${c.sourceFile})`).join('\n');

      const topicsPrompt = fillPrompt(topicsTemplate, {
        summariesList: summariesListStr,
        conceptsList: conceptsListStr
      });
      const topicsResult = await callLLM(topicsPrompt);
      const topicsContent = topicsResult.content || topicsResult;

      // Parse multiple topics separated by ---TOPIC_SEPARATOR---
      const topicFiles = topicsContent.split('---TOPIC_SEPARATOR---').filter(t => t.trim());
      for (const topicContent of topicFiles) {
        const trimmed = topicContent.trim();
        if (!trimmed) continue;

        // Extract topic name from first line (# Topic Name)
        const nameMatch = trimmed.match(/^#\s+(.+)$/m);
        const topicName = nameMatch ? nameMatch[1].replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_') : 'unknown_topic';

        writeMarkdownFile(path.join(topicsDir, `${topicName}.md`), trimmed);
        report.topics++;
        const lineCount = trimmed.split('\n').length;
        console.log(`  ✓ 主题: ${topicName} (${trimmed.length} 字, ${lineCount} 行)`);
      }
    } catch (e) {
      console.log(`  ⚠️ 主题聚合失败: ${e.message}`);
    }
  }

  // Handle deletions
  for (const del of changes.deleted) {
    console.log(`\n🗑️  清理已删除文件: ${del.relPath}`);
    for (const wikiRef of del.record.wikiRefs || []) {
      const wikiPath = path.join(resolvedPath, wikiRef);
      if (fs.existsSync(wikiPath)) { fs.unlinkSync(wikiPath); console.log(`  🗑️  已删除: ${wikiRef}`); }
    }
    delete state.files[del.relPath];
  }

  updateIndex(resolvedPath, wikiDir);
  saveKbState(resolvedPath, state);

  autoCommitWiki(resolvedPath, `wiki: compile - ${report.processed} files, ${report.concepts} concepts, ${report.topics} topics`);

  console.log(`\n✓ 编译完成!\n\n📋 编译报告\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📥 输入统计\n  • 处理文件: ${report.processed} 个\n  • 跳过文件: ${changes.unchanged.length} 个 (未变更)\n  • 清洗脏数据: ${report.cleaned} 个\n\n📤 输出统计\n  • 生成摘要: ${report.processed} 篇\n  • 提取概念: ${report.concepts} 个\n  • 提取人物: ${report.people} 个\n  • 生成主题: ${report.topics} 个\n  • Wiki链接: ${report.links} 条\n\n⚠️ 问题发现\n  • 编译失败: ${report.issues.length} 个\n${report.issues.map(i => `  • ${i.file}: ${i.error}`).join('\n') || '  • 无'}\n\n💡 建议\n  • 请抽检 wiki/summaries/ 确认内容准确性\n  • 运行 wiki lint 进行深度质量检查\n  • 运行 wiki view 查看完整知识库\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✓ 已自动提交Git`);
}

function parseJsonFromLlmOutput(text) {
  const jsonMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[1]); } catch (e) {} }
  try { return JSON.parse(text); } catch (e) { return { concepts: [], people: [] }; }
}

function updateIndex(kbPath, wikiDir) {
  const summariesDir = path.join(wikiDir, 'summaries');
  const conceptsDir = path.join(wikiDir, 'concepts');
  const peopleDir = path.join(wikiDir, 'people');
  const topicsDir = path.join(wikiDir, 'topics');

  let index = '# 知识库索引\n\n';
  index += `> 最后更新: ${new Date().toISOString()}\n\n`;

  // Topics first (highest-level navigation)
  index += '## 核心主题\n\n';
  if (fs.existsSync(topicsDir)) {
    const topicFiles = fs.readdirSync(topicsDir).filter(f => f.endsWith('.md'));
    if (topicFiles.length > 0) {
      for (const file of topicFiles) {
        const name = path.basename(file, '.md');
        // Read first few lines to get topic description
        const topicPath = path.join(topicsDir, file);
        const content = fs.readFileSync(topicPath, 'utf-8');
        const descMatch = content.match(/^>\s+(.+)$/m);
        const desc = descMatch ? ` - ${descMatch[1]}` : '';
        index += `- [[${name}]]${desc}\n`;
      }
    } else {
      index += '> 主题聚合页尚未生成，运行 wiki compile 后将自动创建。\n\n';
    }
  }

  // Summaries
  index += '\n## 文章摘要\n\n';
  if (fs.existsSync(summariesDir)) {
    fs.readdirSync(summariesDir).filter(f => f.endsWith('.md')).forEach(file => {
      index += `- [[${path.basename(file, '.md')}]]\n`;
    });
  }

  // Concepts
  index += '\n## 概念\n\n';
  if (fs.existsSync(conceptsDir)) {
    fs.readdirSync(conceptsDir).filter(f => f.endsWith('.md')).forEach(file => {
      index += `- [[${path.basename(file, '.md')}]]\n`;
    });
  }

  // People
  index += '\n## 人物\n\n';
  if (fs.existsSync(peopleDir)) {
    fs.readdirSync(peopleDir).filter(f => f.endsWith('.md')).forEach(file => {
      index += `- [[${path.basename(file, '.md')}]]\n`;
    });
  }

  fs.writeFileSync(path.join(wikiDir, 'index.md'), index);
}

module.exports = { compile };
