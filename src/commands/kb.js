/**
 * wiki list - List all registered knowledge bases
 * wiki add - Register a new knowledge base
 * wiki switch - Switch default knowledge base
 * wiki remove - Remove a knowledge base registration
 */

const config = require('../utils/config');

/**
 * wiki list - Show all registered knowledge bases
 */
async function listKbs() {
  console.log('📚 已注册的知识库:\n');
  
  const kbs = config.listKbs();
  const keys = Object.keys(kbs);
  
  if (keys.length === 0) {
    console.log('  (暂无已注册的知识库)');
    console.log('  使用 wiki add <name> <path> 注册新知识库');
    console.log('  使用 wiki init 初始化新知识库\n');
    return;
  }
  
  const globalConfig = config.loadGlobalConfig();
  const defaultKb = globalConfig.defaultKb || keys[0];
  
  keys.forEach((name, i) => {
    const kb = kbs[name];
    const isDefault = name === defaultKb ? ' ✓ (默认)' : '';
    console.log(`  ${i + 1}. ${name}${isDefault}`);
    console.log(`     路径: ${kb.path}`);
    if (kb.description) {
      console.log(`     描述: ${kb.description}`);
    }
    console.log(`     创建: ${kb.createdAt}\n`);
  });
  
  console.log(`总计: ${keys.length} 个知识库\n`);
  console.log('切换默认知识库: wiki switch <name>');
  console.log('添加知识库:     wiki add <name> <path>');
  console.log('移除知识库:     wiki remove <name>');
}

/**
 * wiki add - Register a new knowledge base
 */
async function addKb(name, kbPath) {
  if (!name) {
    console.error('❌ 请指定知识库名称');
    console.log('用法: wiki add <name> <path>');
    console.log('示例: wiki add ai-notes D:\\my-ai-notes');
    process.exit(1);
  }
  
  if (!kbPath) {
    console.error('❌ 请指定知识库路径');
    console.log('用法: wiki add <name> <path>');
    process.exit(1);
  }
  
  const entry = config.addKb(name, kbPath);
  console.log(`✅ 已注册知识库 "${name}"`);
  console.log(`   路径: ${entry.path}`);
  
  const kbs = config.listKbs();
  if (Object.keys(kbs).length === 1) {
    console.log('   (已设为默认知识库)');
  }
}

/**
 * wiki switch - Switch default knowledge base
 */
async function switchKb(name) {
  if (!name) {
    // Show available KBs for selection
    const kbs = config.listKbs();
    const keys = Object.keys(kbs);
    
    if (keys.length === 0) {
      console.log('❌ 暂无已注册的知识库');
      console.log('使用 wiki add <name> <path> 注册新知识库');
      process.exit(1);
    }
    
    console.log('📚 可切换的知识库:\n');
    keys.forEach((kbName, i) => {
      console.log(`  ${i + 1}. ${kbName} - ${kbs[kbName].path}`);
    });
    console.log('\n用法: wiki switch <name>');
    return;
  }
  
  try {
    config.setDefaultKb(name);
    console.log(`✅ 已切换默认知识库为 "${name}"`);
    const kb = config.getKbByName(name);
    console.log(`   路径: ${kb.path}`);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

/**
 * wiki remove - Remove a knowledge base registration
 */
async function removeKb(name) {
  if (!name) {
    console.error('❌ 请指定知识库名称');
    console.log('用法: wiki remove <name>');
    process.exit(1);
  }
  
  try {
    config.removeKb(name);
    console.log(`✅ 已移除知识库 "${name}" 的注册`);
    console.log('   (本地文件未被删除)');
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
}

/**
 * Main dispatcher
 */
async function run(kbPath, options) {
  const subcommand = options._ ? options._[0] : undefined;
  
  switch (subcommand) {
    case 'list':
    case 'ls':
      return listKbs();
    
    case 'add':
      return addKb(options._[1], options._[2]);
    
    case 'switch':
    case 'use':
      return switchKb(options._[1]);
    
    case 'remove':
    case 'rm':
      return removeKb(options._[1]);
    
    default:
      return listKbs();
  }
}

module.exports = { run, listKbs, addKb, switchKb, removeKb };
