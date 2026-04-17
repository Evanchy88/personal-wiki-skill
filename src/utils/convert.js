/**
 * 文件格式转换工具
 * 支持 PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), HTML, EPUB 等格式转换为 Markdown
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 支持的文件格式映射
const SUPPORTED_FORMATS = {
  '.pdf': 'PDF',
  '.docx': 'Word',
  '.pptx': 'PowerPoint',
  '.xlsx': 'Excel',
  '.xls': 'Excel',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.epub': 'EPUB',
  '.csv': 'CSV',
  '.xml': 'XML',
  '.json': 'JSON',
  '.txt': 'TXT'
};

/**
 * 检查文件是否为支持的格式
 */
function isSupportedFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS.hasOwnProperty(ext);
}

/**
 * 检查是否已经是 Markdown 格式
 */
function isMarkdownFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.md' || ext === '.markdown';
}

/**
 * 使用 markitdown 转换文件为 Markdown
 * markitdown 是一个通用的文档转换工具，支持 PDF, Word, PPT, Excel, HTML, EPUB 等
 */
function convertWithMarkitdown(filePath) {
  try {
    // 尝试使用 markitdown CLI
    const result = execSync(`npx -y markitdown "${filePath}"`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
    return result;
  } catch (e) {
    console.log(`  ⚠️ markitdown 转换失败: ${e.message}`);
    return null;
  }
}

/**
 * 使用 pandoc 转换文件（如果安装了的话）
 */
function convertWithPandoc(filePath, outputFormat = 'markdown') {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // 检查 pandoc 是否可用
    execSync('pandoc --version', { stdio: 'ignore' });
    
    const outputPath = filePath + '.tmp.md';
    execSync(`pandoc "${filePath}" -t ${outputFormat} -o "${outputPath}"`, {
      encoding: 'utf-8'
    });
    
    const content = fs.readFileSync(outputPath, 'utf-8');
    fs.unlinkSync(outputPath); // 清理临时文件
    
    return content;
  } catch (e) {
    // pandoc 未安装或转换失败
    return null;
  }
}

/**
 * 简单的 HTML 转 Markdown
 */
function htmlToMarkdown(html) {
  // 去除 HTML 标签，保留基本结构
  let md = html;
  
  // 移除 script 和 style 标签及其内容
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // 标题转换
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');
  
  // 段落
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  
  // 列表
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, (match) => match);
  md = md.replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, (match) => match);
  
  // 粗体和斜体
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // 链接
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // 图片
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  
  // 代码块
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // 换行
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // 表格
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
    const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    let tableMd = '\n';
    rows.forEach((row, idx) => {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const cellTexts = cells.map(cell => cell.replace(/<[^>]+>/g, '').trim());
      tableMd += '| ' + cellTexts.join(' | ') + ' |\n';
      if (idx === 0) {
        tableMd += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
      }
    });
    return tableMd;
  });
  
  // 移除剩余 HTML 标签
  md = md.replace(/<[^>]+>/g, '');
  
  // 清理多余空行
  md = md.replace(/\n{3,}/g, '\n\n');
  
  return md.trim();
}

/**
 * 简单的 CSV 转 Markdown 表格
 */
function csvToMarkdown(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return '';
  
  let md = '\n';
  lines.forEach((line, idx) => {
    // 简单的 CSV 解析（不处理引号内的逗号）
    const cells = line.split(',').map(c => c.trim());
    md += '| ' + cells.join(' | ') + ' |\n';
    if (idx === 0) {
      md += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
    }
  });
  
  return md;
}

/**
 * 简单的 JSON 转 Markdown
 */
function jsonToMarkdown(jsonContent) {
  try {
    const obj = JSON.parse(jsonContent);
    return '\n```json\n' + JSON.stringify(obj, null, 2) + '\n```\n';
  } catch (e) {
    return '\n```\n' + jsonContent + '\n```\n';
  }
}

/**
 * 主要的转换函数
 * 尝试多种方法转换文件为 Markdown
 */
function convertToMarkdown(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const format = SUPPORTED_FORMATS[ext];
  
  console.log(`  🔄 转换 ${format || ext} 文件: ${path.basename(filePath)}`);
  
  let mdContent = null;
  
  // 方法1: 尝试 markitdown（通用转换器）
  if (!mdContent) {
    mdContent = convertWithMarkitdown(filePath);
    if (mdContent) {
      console.log(`  ✓ 使用 markitdown 转换成功`);
    }
  }
  
  // 方法2: 尝试 pandoc
  if (!mdContent) {
    mdContent = convertWithPandoc(filePath);
    if (mdContent) {
      console.log(`  ✓ 使用 pandoc 转换成功`);
    }
  }
  
  // 方法3: 内置简单转换器
  if (!mdContent) {
    try {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      
      switch (ext) {
        case '.html':
        case '.htm':
          mdContent = htmlToMarkdown(rawContent);
          console.log(`  ✓ 使用内置 HTML 转换器`);
          break;
          
        case '.csv':
          mdContent = csvToMarkdown(rawContent);
          console.log(`  ✓ 使用内置 CSV 转换器`);
          break;
          
        case '.json':
          mdContent = jsonToMarkdown(rawContent);
          console.log(`  ✓ 使用内置 JSON 转换器`);
          break;
          
        case '.txt':
          mdContent = rawContent;
          console.log(`  ✓ TXT 文件直接读取`);
          break;
          
        default:
          console.log(`  ⚠️ 无法自动转换 ${ext} 文件，请安装 markitdown 或 pandoc`);
          console.log(`     安装命令: npm install -g markitdown`);
          return null;
      }
    } catch (e) {
      console.log(`  ⚠️ 读取文件失败: ${e.message}`);
      return null;
    }
  }
  
  return mdContent;
}

/**
 * 将文件转换并保存为 Markdown
 * @param {string} filePath - 源文件路径
 * @param {string} outputDir - 输出目录
 * @returns {string|null} 转换后的 Markdown 文件路径
 */
function convertAndSave(filePath, outputDir) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath, ext);
  const outputPath = path.join(outputDir, `${basename}.md`);
  
  // 如果输出文件已存在且比源文件新，跳过
  if (fs.existsSync(outputPath)) {
    const srcStats = fs.statSync(filePath);
    const outStats = fs.statSync(outputPath);
    if (outStats.mtimeMs >= srcStats.mtimeMs) {
      console.log(`  ⏭️  ${path.basename(filePath)} 已转换，跳过`);
      return outputPath;
    }
  }
  
  const mdContent = convertToMarkdown(filePath);
  
  if (!mdContent) {
    console.log(`  ❌ 转换失败: ${path.basename(filePath)}`);
    return null;
  }
  
  // 添加元数据头部
  const header = `---
title: ${basename}
source: ${path.basename(filePath)}
converted: ${new Date().toISOString().split('T')[0]}
---

`;
  
  fs.writeFileSync(outputPath, header + mdContent, 'utf-8');
  console.log(`  ✓ 已保存: ${path.basename(outputPath)}`);
  
  return outputPath;
}

module.exports = {
  SUPPORTED_FORMATS,
  isSupportedFormat,
  isMarkdownFile,
  convertToMarkdown,
  convertAndSave
};
