const fs = require('fs');
const path = require('path');
const https = require('https');

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

/**
 * 调用 LLM API
 * 支持以下配置方式（优先级从高到低）：
 * 1. DASHSCOPE_API_KEY - 阿里云 DashScope（通义千问）
 * 2. OPENAI_API_KEY + OPENAI_BASE_URL - OpenAI 兼容接口
 * 3. 占位符模式（Qoder/Copilot 环境会拦截此调用）
 */
async function callLLM(prompt, options = {}) {
  const model = options.model || process.env.QWEN_MODEL || 'qwen-plus';
  
  console.log(`[LLM] Calling model: ${model}`);
  console.log(`[LLM] Prompt length: ${prompt.length} chars`);
  
  // 尝试 DashScope API（阿里云通义千问）
  const dashscopeKey = process.env.DASHSCOPE_API_KEY;
  if (dashscopeKey) {
    return callDashScope(prompt, model, dashscopeKey);
  }
  
  // 尝试 OpenAI 兼容接口
  const openaiKey = process.env.OPENAI_API_KEY;
  const openaiBase = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  if (openaiKey) {
    return callOpenAI(prompt, model, openaiKey, openaiBase);
  }
  
  // 占位符模式：Qoder/Copilot 等 AI 工具会拦截此调用
  console.log('[LLM] ⚠️ 未配置 LLM API 密钥，返回占位符');
  console.log('[LLM] 💡 配置方式：');
  console.log('[LLM]    - 阿里云 DashScope: 设置 DASHSCOPE_API_KEY 环境变量');
  console.log('[LLM]    - OpenAI 兼容接口: 设置 OPENAI_API_KEY 和 OPENAI_BASE_URL');
  console.log('[LLM]    - AI 工具环境: Qoder/Copilot 会自动拦截 callLLM 调用');
  
  return {
    content: '[LLM response content]',
    model: model,
    usage: { input_tokens: 0, output_tokens: 0 }
  };
}

/**
 * 调用阿里云 DashScope API
 */
function callDashScope(prompt, model, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: model,
      input: {
        messages: [
          { role: 'user', content: prompt }
        ]
      }
    });
    
    const req = https.request({
      hostname: 'dashscope.aliyuncs.com',
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            const content = json.choices?.[0]?.message?.content || '';
            console.log(`[LLM] ✓ 调用成功 (${content.length} 字)`);
            resolve({
              content,
              model: json.model || model,
              usage: json.usage || { input_tokens: 0, output_tokens: 0 }
            });
          }
        } catch (e) {
          reject(new Error(`响应解析失败: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 调用 OpenAI 兼容接口
 */
function callOpenAI(prompt, model, apiKey, baseURL) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseURL + '/chat/completions');
    const postData = JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            const content = json.choices?.[0]?.message?.content || '';
            console.log(`[LLM] ✓ 调用成功 (${content.length} 字)`);
            resolve({
              content,
              model: json.model || model,
              usage: json.usage || { input_tokens: 0, output_tokens: 0 }
            });
          }
        } catch (e) {
          reject(new Error(`响应解析失败: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
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
