const fs = require('fs');
const path = require('path');

function loadPrompt(promptName, promptsDir) {
  const promptPath = path.join(promptsDir, `${promptName}.md`);
  if (fs.existsSync(promptPath)) {
    return fs.readFileSync(promptPath, 'utf-8');
  }
  return null;
}

function fillPrompt(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

async function callLLM(prompt, options = {}) {
  // This function should be implemented based on the LLM provider
  // For Qoder, it will use the built-in LLM capabilities
  // The actual implementation depends on the runtime environment
  
  const model = options.model || process.env.QWEN_MODEL || 'qwen-plus';
  
  // Placeholder for actual LLM call
  // In Qoder environment, this should use the available LLM API
  console.log(`[LLM] Calling model: ${model}`);
  console.log(`[LLM] Prompt length: ${prompt.length} chars`);
  
  // Return placeholder - actual implementation depends on environment
  return {
    content: '[LLM response content]',
    model: model,
    usage: { input_tokens: 0, output_tokens: 0 }
  };
}

async function compileFile(fileContent, filePath, promptsDir) {
  const template = loadPrompt('compile', promptsDir);
  if (!template) {
    throw new Error('Compile prompt not found');
  }
  
  const prompt = fillPrompt(template, {
    fileContent: fileContent,
    filePath: filePath
  });
  
  return callLLM(prompt);
}

async function cleanDocument(content, promptsDir) {
  const template = loadPrompt('clean', promptsDir);
  if (!template) {
    throw new Error('Clean prompt not found');
  }
  
  const prompt = fillPrompt(template, {
    '待清洗的文档内容': content
  });
  
  return callLLM(prompt);
}

async function answerQuestion(question, wikiContext, promptsDir) {
  const template = loadPrompt('qa', promptsDir);
  if (!template) {
    throw new Error('QA prompt not found');
  }
  
  const prompt = fillPrompt(template, {
    '从wiki/目录中检索的相关文章内容': wikiContext,
    '用户的问题': question
  });
  
  return callLLM(prompt);
}

async function runLint(wikiContent, promptsDir) {
  const template = loadPrompt('lint', promptsDir);
  if (!template) {
    throw new Error('Lint prompt not found');
  }
  
  const prompt = fillPrompt(template, {
    'wiki/目录路径': wikiContent
  });
  
  return callLLM(prompt);
}

module.exports = {
  loadPrompt,
  fillPrompt,
  callLLM,
  compileFile,
  cleanDocument,
  answerQuestion,
  runLint
};
