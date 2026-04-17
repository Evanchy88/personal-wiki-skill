const path = require('path');
const fs = require('fs');
const { resolveKbPath, loadKbState, saveKbState } = require('../utils/config');
const { scanDirectory, computeHash, getFileStats, detectDirtyContent, readMarkdownFile, writeMarkdownFile, extractWikiLinks, scanAndConvertDirectory, getSupportedFormats } = require('../utils/file');
const { autoCommitWiki } = require('../utils/git');
const { loadPrompt, fillPrompt, callLLM } = require('../utils/llm');

/**
 * 检测文档类型
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {string} forceType - 用户强制指定的类型
 * @returns {string} 文档类型: 'academic' | 'news' | 'technical' | 'narrative'
 */
function detectDocType(filePath, content, forceType = null) {
  if (forceType) {
    return forceType;
  }

  // 路径启发式判断
  const pathHints = [
    { keywords: ['papers', 'paper', 'research', '论文', '学术', 'study'], type: 'academic' },
    { keywords: ['news', '资讯', '报道', '新闻', 'media', '报道'], type: 'news' },
    { keywords: ['tutorial', 'tutorials', 'docs', '教程', 'guide', '配置', '安装', 'api'], type: 'technical' }
  ];

  const lowerPath = filePath.toLowerCase();
  for (const hint of pathHints) {
    if (hint.keywords.some(kw => lowerPath.includes(kw.toLowerCase()))) {
      return hint.type;
    }
  }

  // 内容特征判断（简化版，基于关键词）
  const contentHints = [
    { keywords: ['摘要', '关键词', '参考文献', '实验', '假设', '方法论', '显著性', 'p值'], type: 'academic' },
    { keywords: ['本报讯', '记者', '报道', '据悉', '官方回应', '突发事件'], type: 'news' },
    { keywords: ['代码', 'API', '安装', '配置', 'npm', 'package', 'function', 'class'], type: 'technical' }
  ];

  for (const hint of contentHints) {
    const matchCount = hint.keywords.filter(kw => content.includes(kw)).length;
    if (matchCount >= 3) {
      return hint.type;
    }
  }

  return 'narrative'; // 默认类型
}

/**
 * 根据文档类型加载对应的prompt模板
 * @param {string} stage - 编译阶段: 'compile' | 'summary' | 'concept' | 'person' | 'topics' | 'method' | 'finding' | 'event' | 'technique'
 * @param {string} docType - 文档类型: 'academic' | 'news' | 'technical' | 'narrative'
 * @param {string} promptsDir - prompts目录路径
 * @returns {string} prompt模板内容
 */
function loadPromptForType(stage, docType, promptsDir) {
  // 对于特定类型，尝试加载专用prompt
  const promptMap = {
    academic: {
      compile: 'compile-academic',
      summary: 'summary-academic',
      method: 'method',
      finding: 'finding'
    },
    news: {
      compile: 'compile-news',
      summary: 'summary-news',
      event: 'event'
    },
    technical: {
      compile: 'compile-tech',
      summary: 'summary-tech',
      technique: 'technique'
    }
  };

  if (promptMap[docType] && promptMap[docType][stage]) {
    const promptName = promptMap[docType][stage];
    try {
      return loadPrompt(promptName, promptsDir);
    } catch (e) {
      // 如果专用prompt不存在，回退到默认
      console.log(`  ⚠️ Prompt "${promptName}" 不存在，使用默认`);
    }
  }

  // 回退到默认prompt
  const fallbackMap = {
    compile: 'compile',
    summary: 'summary',
    concept: 'concept',
    person: 'person',
    topics: 'topics'
  };

  return loadPrompt(fallbackMap[stage] || stage, promptsDir);
}

/**
 * 验证并清理 wikilink
 * 将无效的 wikilink（指向不存在的文件）移除，避免 Obsidian 图谱出现幽灵节点
 * @param {string} content - Markdown 内容
 * @param {Object} validLinks - 有效的链接集合 { concepts: Set, people: Set, summaries: Set, topics: Set }
 * @param {Object} report - 报告对象，用于统计移除的无效链接数量
 * @returns {string} 清理后的内容
 */
function validateAndCleanWikiLinks(content, validLinks, report = null) {
  // 匹配 [[wikilink]] 格式
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  let removedCount = 0;
  
  const cleaned = content.replace(wikilinkRegex, (match, linkText) => {
    const cleanName = linkText.trim();
    
    // 检查是否是有效的链接
    const isValid = 
      validLinks.concepts.has(cleanName) ||
      validLinks.people.has(cleanName) ||
      validLinks.summaries.has(cleanName) ||
      validLinks.topics.has(cleanName);
    
    if (isValid) {
      return match; // 保留有效链接
    }
    
    // 无效链接：移除 wikilink 格式，只保留纯文本
    removedCount++;
    return cleanName;
  });
  
  if (removedCount > 0 && report) {
    report.invalidLinksRemoved += removedCount;
  }
  
  return cleaned;
}

/**
 * 构建有效的 wikilink 集合
 */
function buildValidLinksSet(wikiDir) {
  const validLinks = {
    concepts: new Set(),
    people: new Set(),
    summaries: new Set(),
    topics: new Set()
  };
  
  // 扫描 concepts 目录
  const conceptsDir = path.join(wikiDir, 'concepts');
  if (fs.existsSync(conceptsDir)) {
    fs.readdirSync(conceptsDir).forEach(file => {
      if (file.endsWith('.md')) {
        validLinks.concepts.add(path.basename(file, '.md'));
      }
    });
  }
  
  // 扫描 people 目录
  const peopleDir = path.join(wikiDir, 'people');
  if (fs.existsSync(peopleDir)) {
    fs.readdirSync(peopleDir).forEach(file => {
      if (file.endsWith('.md')) {
        validLinks.people.add(path.basename(file, '.md'));
      }
    });
  }
  
  // 扫描 summaries 目录
  const summariesDir = path.join(wikiDir, 'summaries');
  if (fs.existsSync(summariesDir)) {
    fs.readdirSync(summariesDir).forEach(file => {
      if (file.endsWith('.md')) {
        validLinks.summaries.add(path.basename(file, '.md'));
      }
    });
  }
  
  // 扫描 topics 目录
  const topicsDir = path.join(wikiDir, 'topics');
  if (fs.existsSync(topicsDir)) {
    fs.readdirSync(topicsDir).forEach(file => {
      if (file.endsWith('.md')) {
        validLinks.topics.add(path.basename(file, '.md'));
      }
    });
  }
  
  return validLinks;
}

async function compile(kbPath, options = {}) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath(options.path, options);
  const rawDir = path.join(resolvedPath, 'raw');
  const wikiDir = path.join(resolvedPath, 'wiki');
  const summariesDir = path.join(wikiDir, 'summaries');
  const conceptsDir = path.join(wikiDir, 'concepts');
  const peopleDir = path.join(wikiDir, 'people');
  const topicsDir = path.join(wikiDir, 'topics');
  
  // 类型专有目录
  const methodsDir = path.join(wikiDir, 'methods');
  const findingsDir = path.join(wikiDir, 'findings');
  const eventsDir = path.join(wikiDir, 'events');
  const techniquesDir = path.join(wikiDir, 'techniques');
  
  const promptsDir = path.join(__dirname, '../../prompts');

  // 创建所有目录（包括类型专有目录）
  [wikiDir, summariesDir, conceptsDir, peopleDir, topicsDir, 
   methodsDir, findingsDir, eventsDir, techniquesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const state = loadKbState(resolvedPath);
  const forceType = options.type || null; // 用户强制指定的类型
  const forceRecompile = options.force || false; // 强制重新编译

  // Step 1: Convert non-Markdown files to Markdown (saved directly to raw/)
  console.log('📂 扫描 raw/ 目录...');
  const { mdFiles, converted, skipped, errors } = scanAndConvertDirectory(rawDir);
  
  if (mdFiles.length === 0) {
    console.log('❌ raw/ 目录为空或无可支持的文件，请先添加一些文章');
    console.log(`   支持的格式: ${Object.values(getSupportedFormats()).join(', ')}`);
    return;
  }
  
  if (converted > 0) {
    console.log(`  ✓ 转换了 ${converted} 个非 Markdown 文件`);
  }
  if (errors.length > 0) {
    console.log(`  ⚠️ ${errors.length} 个文件转换失败: ${errors.join(', ')}`);
  }

  const rawFiles = mdFiles;
  const changes = { added: [], modified: [], deleted: [], unchanged: [] };

  for (const file of rawFiles) {
    const relPath = path.relative(resolvedPath, file);
    const record = state.files[relPath];
    const stats = getFileStats(file);
    
    // 如果强制重新编译，将所有文件视为已修改
    if (forceRecompile) {
      if (record) {
        changes.modified.push({ file, relPath, stats, oldRecord: record });
      } else {
        changes.added.push({ file, relPath, stats });
      }
    } else if (!record) {
      changes.added.push({ file, relPath, stats });
    } else if (record.hash !== stats.hash) {
      changes.modified.push({ file, relPath, stats, oldRecord: record });
    } else {
      changes.unchanged.push({ file, relPath });
    }
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
  console.log('📝 编译模式: 自动识别文档类型 → 提取关键要素 → 撰写摘要 → 深入概念 → 主题聚合\n');

  const report = { 
    processed: 0, concepts: 0, people: 0, topics: 0, links: 0, cleaned: 0, 
    issues: [], invalidLinksRemoved: 0, 
    methods: 0, findings: 0, events: 0, techniques: 0 
  };

  // Track all extracted concepts for topic aggregation
  const allConcepts = [];
  const allSummaries = [];

  // Build valid links set for wikilink validation (will be updated as we compile)
  let validLinks = buildValidLinksSet(wikiDir);

  for (const item of toProcess) {
    const idx = toProcess.indexOf(item) + 1;
    const filename = path.basename(item.file, path.extname(item.file));
    console.log(`\n[${idx}/${toProcess.length}] 研读 ${filename}...`);

    let content = readMarkdownFile(item.file);
    
    // 识别文档类型
    const docType = detectDocType(item.relPath, content, forceType);
    console.log(`  🏷️ 文档类型: ${docType}`);

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
      // Phase 1: 根据类型提取关键要素
      console.log('  [1/4] 提取关键要素...');
      const extractTemplate = loadPromptForType('compile', docType, promptsDir);
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

      // Phase 2: 生成摘要（根据类型使用不同prompt）
      console.log('  [2/4] 生成文章摘要...');
      const summaryTemplate = loadPromptForType('summary', docType, promptsDir);
      const summaryPrompt = fillPrompt(summaryTemplate, {
        filePath: item.relPath,
        fileContent: content,
        extractedJson: JSON.stringify(extractJson, null, 2),
        conceptsJson: JSON.stringify(extractJson, null, 2),
        title: extractJson.title || filename,
        author: extractJson.author || extractJson.authors?.join(', ') || '未知',
        date: new Date().toISOString().split('T')[0]
      });
      const summaryResult = await callLLM(summaryPrompt);
      let summaryContent = summaryResult.content || summaryResult;
      
      const summaryPath = path.join(summariesDir, `${filename}.md`);
      allSummaries.push({ filename, title: extractJson.title || filename, content: summaryContent, path: summaryPath, docType });
      console.log(`    ✓ 生成摘要: ${summaryContent.length} 字`);

      // Phase 3a: 生成通用概念详细条目
      if (concepts.length > 0) {
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
          let conceptContent = conceptResult.content || conceptResult;
          
          conceptContent = validateAndCleanWikiLinks(conceptContent, validLinks, report);
          writeMarkdownFile(path.join(conceptsDir, `${safeName}.md`), conceptContent);
          report.concepts++;
          validLinks.concepts.add(safeName);
          
          console.log(`    ✓ 概念: ${concept.name} (${conceptContent.length} 字)`);
        }
      }

      // Phase 3b: 生成人物详细条目
      if (people.length > 0) {
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
          let personContent = personResult.content || personResult;
          
          personContent = validateAndCleanWikiLinks(personContent, validLinks, report);
          writeMarkdownFile(path.join(peopleDir, `${safeName}.md`), personContent);
          report.people++;
          validLinks.people.add(safeName);
          
          console.log(`    ✓ 人物: ${person.name} (${personContent.length} 字)`);
        }
      }

      // Phase 3c: 根据类型生成专有条目
      if (docType === 'academic') {
        // 生成方法论条目
        if (extractJson.methods && extractJson.methods.length > 0) {
          console.log('  [3/4] 撰写方法论条目...');
          const methodTemplate = loadPromptForType('method', docType, promptsDir);
          for (const method of extractJson.methods) {
            const safeName = method.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
            const methodPrompt = fillPrompt(methodTemplate, {
              methodName: method.name,
              methodType: method.type,
              methodBrief: method.description,
              sourceFile: item.relPath,
              fileContent: content
            });
            const methodResult = await callLLM(methodPrompt);
            let methodContent = methodResult.content || methodResult;
            
            methodContent = validateAndCleanWikiLinks(methodContent, validLinks, report);
            writeMarkdownFile(path.join(methodsDir, `${safeName}.md`), methodContent);
            report.methods++;
            validLinks.concepts.add(safeName); // 加入有效链接
            
            console.log(`    ✓ 方法: ${method.name} (${methodContent.length} 字)`);
          }
        }

        // 生成研究发现条目
        if (extractJson.findings && extractJson.findings.length > 0) {
          console.log('  [3/4] 撰写研究发现条目...');
          const findingTemplate = loadPromptForType('finding', docType, promptsDir);
          for (const finding of extractJson.findings) {
            const safeName = finding.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
            const findingPrompt = fillPrompt(findingTemplate, {
              findingName: finding.name,
              findingBrief: finding.statement,
              sourceFile: item.relPath,
              fileContent: content
            });
            const findingResult = await callLLM(findingPrompt);
            let findingContent = findingResult.content || findingResult;
            
            findingContent = validateAndCleanWikiLinks(findingContent, validLinks, report);
            writeMarkdownFile(path.join(findingsDir, `${safeName}.md`), findingContent);
            report.findings++;
            validLinks.concepts.add(safeName);
            
            console.log(`    ✓ 发现: ${finding.name} (${findingContent.length} 字)`);
          }
        }
      } else if (docType === 'news') {
        // 生成新闻事件条目
        if (extractJson.events && extractJson.events.length > 0) {
          console.log('  [3/4] 撰写新闻事件条目...');
          const eventTemplate = loadPromptForType('event', docType, promptsDir);
          for (const event of extractJson.events) {
            const safeName = event.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
            const eventPrompt = fillPrompt(eventTemplate, {
              eventName: event.name,
              eventBrief: event.what,
              sourceFile: item.relPath,
              fileContent: content
            });
            const eventResult = await callLLM(eventPrompt);
            let eventContent = eventResult.content || eventResult;
            
            eventContent = validateAndCleanWikiLinks(eventContent, validLinks, report);
            writeMarkdownFile(path.join(eventsDir, `${safeName}.md`), eventContent);
            report.events++;
            validLinks.concepts.add(safeName);
            
            console.log(`    ✓ 事件: ${event.name} (${eventContent.length} 字)`);
          }
        }
      } else if (docType === 'technical') {
        // 生成技术方案条目
        if (extractJson.techniques && extractJson.techniques.length > 0) {
          console.log('  [3/4] 撰写技术方案条目...');
          const techniqueTemplate = loadPromptForType('technique', docType, promptsDir);
          for (const technique of extractJson.techniques) {
            const safeName = technique.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_');
            const techniquePrompt = fillPrompt(techniqueTemplate, {
              techName: technique.name,
              techCategory: technique.category,
              techBrief: technique.description,
              sourceFile: item.relPath,
              fileContent: content
            });
            const techniqueResult = await callLLM(techniquePrompt);
            let techniqueContent = techniqueResult.content || techniqueResult;
            
            techniqueContent = validateAndCleanWikiLinks(techniqueContent, validLinks, report);
            writeMarkdownFile(path.join(techniquesDir, `${safeName}.md`), techniqueContent);
            report.techniques++;
            validLinks.concepts.add(safeName);
            
            console.log(`    ✓ 技术: ${technique.name} (${techniqueContent.length} 字)`);
          }
        }
      }

      // 验证并写入摘要
      const validatedSummary = validateAndCleanWikiLinks(summaryContent, validLinks, report);
      writeMarkdownFile(summaryPath, validatedSummary);
      report.links += extractWikiLinks(validatedSummary).length;
      report.processed++;

      // 更新状态（包含文档类型）
      state.files[item.relPath] = {
        mtime: item.stats.mtime,
        hash: item.stats.hash,
        size: item.stats.size,
        compiled: true,
        docType,
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

  console.log(`\n✓ 编译完成!\n\n📋 编译报告\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📥 输入统计\n  • 处理文件: ${report.processed} 个\n  • 跳过文件: ${changes.unchanged.length} 个 (未变更)\n  • 清洗脏数据: ${report.cleaned} 个\n  • 格式转换: ${converted} 个文件\n\n📤 输出统计\n  • 生成摘要: ${report.processed} 篇\n  • 提取概念: ${report.concepts} 个\n  • 提取人物: ${report.people} 个\n  • 生成主题: ${report.topics} 个\n  • 方法论: ${report.methods} 个\n  • 研究发现: ${report.findings} 个\n  • 新闻事件: ${report.events} 个\n  • 技术方案: ${report.techniques} 个\n  • Wiki链接: ${report.links} 条\n  • 移除无效链接: ${report.invalidLinksRemoved} 个\n\n⚠️ 问题发现\n  • 编译失败: ${report.issues.length} 个\n${report.issues.map(i => `  • ${i.file}: ${i.error}`).join('\n') || '  • 无'}\n${errors.length > 0 ? `\n  • 转换失败: ${errors.length} 个\n${errors.map(e => `  • ${e}`).join('\n')}` : ''}\n\n💡 建议\n  • 请抽检 wiki/summaries/ 确认内容准确性\n  • 运行 wiki lint 进行深度质量检查\n  • 运行 wiki view 查看完整知识库\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✓ 已自动提交Git`);
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
