const path = require('path');
const fs = require('fs');
const { resolveKbPath } = require('../utils/config');
const { readMarkdownFile, writeMarkdownFile, detectDirtyContent } = require('../utils/file');
const { cleanDocument } = require('../utils/llm');

async function clean(filePath, kbPath) {
  const resolvedPath = kbPath ? path.resolve(kbPath) : resolveKbPath();
  
  let fileToClean;
  if (filePath) {
    fileToClean = path.isAbsolute(filePath) ? filePath : path.join(resolvedPath, filePath);
  } else {
    // Clean all files in raw/
    const rawDir = path.join(resolvedPath, 'raw');
    console.log('🧹 正在扫描 raw/ 目录...');
    
    const files = scanFiles(rawDir);
    let cleaned = 0;
    
    for (const file of files) {
      const content = readMarkdownFile(file);
      if (content && detectDirtyContent(content)) {
        console.log(`  • 清洗 ${path.relative(rawDir, file)}...`);
        try {
          const cleanContent = await cleanDocument(content);
          if (cleanContent && cleanContent.content) {
            writeMarkdownFile(file, cleanContent.content);
            cleaned++;
            console.log(`    ✓ 已保存清洗结果`);
          } else if (typeof cleanContent === 'string') {
            writeMarkdownFile(file, cleanContent);
            cleaned++;
            console.log(`    ✓ 已保存清洗结果`);
          } else {
            console.log(`    ⚠️ 清洗返回空结果，跳过`);
          }
        } catch (e) {
          console.log(`    ❌ 清洗失败: ${e.message}`);
        }
      }
    }
    
    console.log(`\n✓ 清洗完成，共处理 ${cleaned} 个文件`);
    return;
  }
  
  if (!fs.existsSync(fileToClean)) {
    console.log(`❌ 文件不存在: ${fileToClean}`);
    return;
  }
  
  const content = readMarkdownFile(fileToClean);
  if (!detectDirtyContent(content)) {
    console.log('✓ 文件已经是干净的，无需清洗');
    return;
  }
  
  console.log('🧹 正在清洗文档...');
  
  try {
    const cleanResult = await cleanDocument(content);
    if (cleanResult && cleanResult.content) {
      writeMarkdownFile(fileToClean, cleanResult.content);
      console.log('✓ 清洗完成，已覆盖原文件');
    } else if (typeof cleanResult === 'string') {
      writeMarkdownFile(fileToClean, cleanResult);
      console.log('✓ 清洗完成，已覆盖原文件');
    } else {
      console.log('❌ 清洗返回空结果');
    }
  } catch (e) {
    console.log(`❌ 清洗失败: ${e.message}`);
  }
}

function scanFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...scanFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

module.exports = { clean };
