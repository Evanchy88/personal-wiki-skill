const path = require('path');
const fs = require('fs');
const { resolveKbPath, saveGlobalConfig, addKb } = require('../utils/config');
const { initWikiStructure } = require('../utils/file');
const { initGitRepo } = require('../utils/git');

async function init(userPath, options = {}) {
  const kbPath = userPath ? path.resolve(userPath) : null;
  const kbName = options.name || options.kb;
  
  // If no path provided, ask user
  if (!kbPath) {
    console.log(`📚 personal-wiki 知识库编译器
这个Skill可以帮你：
1. 📥 收集原始文章到 raw/ 目录
2. 🤖 用LLM自动研读并生成结构化笔记到 wiki/ 目录
3. 💬 基于笔记进行深度问答学习

首先，知识库保存在哪个目录？
[1] D:\\knowledge-base (推荐)
[2] 自定义路径

请选择 (1/2) 或直接输入路径:`);
    
    // In actual implementation, this would use an interactive prompt
    // For now, use default
    return initKnowledgeBase(null, options);
  }
  
  return initKnowledgeBase(kbPath, options);
}

async function initKnowledgeBase(userPath, options = {}) {
  const kbPath = userPath || resolveKbPath();
  const kbName = options.name || options.kb || path.basename(kbPath);
  
  console.log(`\n✓ 将保存到: ${kbPath}`);
  console.log(`✓ 知识库名称: ${kbName}\n`);
  console.log('正在初始化知识库...');
  
  // Create directory structure
  initWikiStructure(kbPath);
  console.log('  • 创建 raw/ 目录        ✓');
  console.log('  • 创建 wiki/ 目录       ✓');
  console.log('  • 创建 images/ 目录     ✓');
  
  // Initialize Git
  initGitRepo(kbPath);
  console.log('  • 初始化 Git 仓库       ✓');
  console.log('  • 生成 .gitignore       ✓');
  
  // Register as a knowledge base (multi-KB support)
  addKb(kbName, kbPath);
  console.log(`  • 注册知识库 "${kbName}"  ✓`);
  
  // Save global config (legacy support)
  saveGlobalConfig({ defaultPath: kbPath });
  
  // Create initial .kb-state.json
  const statePath = path.join(kbPath, '.kb-state.json');
  fs.writeFileSync(statePath, JSON.stringify({
    version: 1,
    lastCompile: new Date().toISOString(),
    files: {}
  }, null, 2));
  
  console.log(`\n📁 目录结构:
${kbPath}\\
├── raw/          ← 你把想学习的文章放这里
├── wiki/         ← AI自动生成的学习笔记
├── images/       ← 文章中的图片
└── .kb-state.json ← 编译状态记录

💡 下一步:
1. 把感兴趣的文章保存到 raw/ 目录
2. 运行 wiki compile 开始编译
3. 运行 wiki view 用Obsidian或其他工具查看

📚 多知识库:
  • wiki kb add <name> <path>   注册更多知识库
  • wiki kb list                查看所有知识库
  • wiki compile --kb <name>    指定知识库编译`);
}

module.exports = { init, initKnowledgeBase };
