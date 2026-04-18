---
name: personal-wiki
description: 基于Karpathy理念的个人知识库编译器。AI直接研读文章并整理成结构化的知识体系，无需调用外部LLM API。
---

# personal-wiki

基于Karpathy理念的个人知识库编译器。**你（AI）直接作为编译引擎**，研读用户收集的文章，整理成结构化的知识体系。

## 核心架构变化

**旧架构（已废弃）**：
```
用户请求 → AI执行 node index.js compile → Node.js子进程 → callLLM()占位符 → ❌ 失败
```

**新架构（当前）**：
```
用户请求 → AI直接读取prompt模板 → AI研读文章 → AI生成内容 → AI写入文件 → ✅ 成功
```

**你不再执行 `node index.js compile`**，而是：
1. 读取 `prompts/` 目录下的编译模板，理解规则
2. 扫描 `raw/` 目录，获取待处理文章
3. **你亲自研读每篇文章**，提取概念、人物、主题
4. **你亲自生成摘要和概念条目**，按照 prompt 模板的格式
5. **你亲自写入 `wiki/` 目录**，建立交叉引用

## 如何使用

当用户输入包含以下关键词时，**你直接执行相应操作**（不再运行 node 命令）：

| 用户请求 | 你的操作 |
|---------|---------|
| `wiki compile` / `编译知识库` | 读取 prompts/compile.md → 研读 raw/ 文章 → 生成 wiki/ 内容 |
| `wiki init` / `初始化` | 创建知识库目录结构 + .git 初始化 |
| `wiki clean` / `清洗` | 读取 prompts/clean.md → 清洗指定文件 |
| `wiki lint` / `检查质量` | 读取 prompts/lint.md → 检查链接、覆盖度、时效性 |
| `wiki qa "问题"` | 读取 prompts/qa.md → 在 wiki/ 中检索 → 回答 |
| `wiki status` / `查看状态` | 读取 .kb-state.json → 显示统计信息 |
| `wiki view` / `查看` | 显示 wiki/index.md 内容 |
| `wiki git ...` | 执行 git 操作（log/diff/rollback/branch） |
| `wiki remote ...` | 执行远程同步操作 |
| `wiki kb ...` | 管理多知识库注册 |

所有命令支持 `--kb <name>` 指定知识库，`--path <path>` 指定路径。

## 核心理念

- **用户收集**：将感兴趣的文章保存到 `raw/` 目录
- **AI编译**：**你（AI）作为资深学者**深入研读文章，生成结构化的 `wiki/` 目录
- **纯Markdown**：不依赖特定软件，Obsidian/VS Code/任意编辑器均可查看
- **本地优先**：所有数据在本地，Git版本控制
- **无需外部API**：**你直接生成内容**，不依赖 callLLM() 或外部 LLM API

## 编译执行流程（重要）

当用户请求 `wiki compile` 时，**你必须按以下步骤执行**：

### Step 0: 读取编译规则

首先读取以下文件，理解编译规则：
1. `prompts/compile.md` - 通用编译规则
2. `prompts/concept.md` - 概念条目格式
3. `prompts/person.md` - 人物条目格式
4. `prompts/topics.md` - 主题聚合格式

如果文章是特定类型，额外读取：
- 学术型：`prompts/compile-academic.md`, `prompts/summary-academic.md`, `prompts/method.md`, `prompts/finding.md`
- 新闻型：`prompts/compile-news.md`, `prompts/summary-news.md`, `prompts/event.md`
- 技术型：`prompts/compile-tech.md`, `prompts/summary-tech.md`, `prompts/technique.md`

### Step 1: 扫描 raw/ 目录

```bash
ls raw/
```

获取所有待处理的文章列表（支持 .md, .pdf, .docx, .epub, .html, .csv, .json 等格式）。

### Step 2: 识别文档类型

对每篇文章，判断其类型：
- **narrative**（叙事型）：默认类型
- **academic**（学术型）：路径含 papers/research/论文，或内容含摘要/参考文献/实验
- **news**（新闻型）：路径含 news/资讯/报道，或内容含本报讯/记者
- **technical**（技术型）：路径含 tutorial/docs/教程，或内容含代码/API/配置

用户可用 `--type <类型>` 强制指定，或用 `--force` 强制重新编译所有。

### Step 3: 研读并提取（四阶段编译）

对每篇文章，执行四个阶段：

#### [1/4] 提取关键要素

**你作为资深学者**，通读全文，提取：
- 核心概念列表（concepts）
- 相关人物列表（people）
- 主题标签（topics）
- 类型专有要素（学术：methods/findings；新闻：events；技术：techniques）

输出 JSON 格式：
```json
{
  "title": "文章标题",
  "concepts": [{"name": "概念名", "brief": "一句话简介"}],
  "people": [{"name": "人名", "role": "身份"}],
  "topics": ["主题1", "主题2"]
}
```

#### [2/4] 生成文章摘要

按照 `prompts/summary.md`（或类型专用模板）的格式，生成 200-300 字摘要，包含：
- 核心观点
- 关键数据
- 重要案例
- 交叉引用（使用 `[[wikilink]]` 格式）

保存到 `wiki/summaries/{文件名}.md`

#### [3/4] 撰写详细条目

**对每个概念**：按照 `prompts/concept.md` 格式，生成详细条目
- 💡 概念定义（150-250字）
- 🔍 形成原因
- 📋 具体事例（至少2个）
- 🔗 关联网络（相关人物、主题）

保存到 `wiki/concepts/{概念名}.md`

**对每个人物**：按照 `prompts/person.md` 格式，生成详细条目
- 📋 基本信息（生卒年代、国籍、身份）
- 🎯 性格特征（100-150字）
- 📝 具体事迹（至少2件）
- 🔗 关联网络（相关主题、概念）

保存到 `wiki/people/{人名}.md`

**对类型专有条目**（如学术的方法论、新闻的事件、技术的方案）：按照对应模板生成。

#### [4/4] 主题聚合

所有文章处理完后，按照 `prompts/topics.md` 格式：
- 聚类相关概念
- 生成主题聚合页
- 建立主题与文章、概念的关联

保存到 `wiki/topics/{主题名}.md`

### Step 4: 更新索引和状态

生成 `wiki/index.md` 全局索引，更新 `.kb-state.json` 编译状态。

### Step 5: Git 提交

自动提交变更：
```bash
git add .
git commit -m "wiki: compile - X files, Y concepts, Z topics"
```

## 编译质量要求（必须遵守）

### 角色定义

编译时，你必须是**资深学者和领域专家**：

1. **全面覆盖，不遗漏**：通读全文，识别所有重要概念、观点、论据、数据、案例、人物
2. **忠于原文，不曲解**：摘要必须准确反映原文观点，保留论证逻辑和限定条件
3. **专家视角，有深度**：解释"为什么"和"怎么用"，建立有意义的交叉引用

### 内容格式规范

**概念文件**必须包含：
- 定义 + 形成原因 + 至少2个具体事例 + 关联网络（人物/主题）

**人物文件**必须包含：
- 生卒年代 + 身份 + 性格特征 + 主要成就 + 至少2件具体事迹 + 关联网络

**学术类内容**必须包含：
- 是什么（研究问题）+ 为什么（意义）+ 怎么做（方法）+ 流程图/架构图（文字描述）

**所有文件**必须：
- 使用 emoji 图标增强可读性（💡📋🔗📝🎯等）
- 清晰的层级结构（## ### ####）
- 使用 `[[wikilink]]` 建立交叉引用

### 禁止行为

- ❌ 不要用自己的话"重写"原文，而是"提炼"
- ❌ 不要省略数据、案例、人物
- ❌ 不要过度概括，丢失原文的精确表述
- ❌ 不要混入与原文无关的内容
- ❌ 不要将不同概念混为一谈
- ❌ **不要返回占位符 `[LLM response content]`**，你必须亲自生成内容

## 目录结构

```
knowledge-base/
├── raw/                  # 用户收集的原始材料
│   ├── *.md              # 文章、笔记
│   ├── *.pdf, *.docx     # 其他格式文档（自动转换）
│   └── images/           # 关联图片
├── wiki/                 # AI编译后的知识库
│   ├── index.md          # 全局索引
│   ├── summaries/        # 文章摘要
│   ├── concepts/         # 概念定义（通用）
│   ├── people/           # 人物条目（通用）
│   ├── topics/           # 主题聚合页（通用）
│   ├── methods/          # 学术：方法论
│   ├── findings/         # 学术：研究发现
│   ├── events/           # 新闻：事件
│   └── techniques/       # 技术：技术方案
├── .kb-state.json        # 编译状态记录（包含docType）
├── .kb-config.json       # 全局配置
└── .git/                 # Git版本控制
```

## 多类型文档支持

| 类型 | 识别方式 | 编译侧重 | 专有条目 |
|------|---------|---------|---------|
| **narrative** (叙事型) | 默认 | 概念、人物、主题 | people/ |
| **academic** (学术型) | 路径含papers/research/论文，或内容含摘要/参考文献/实验 | 假设、方法、数据、发现、引用 | methods/, findings/ |
| **news** (新闻型) | 路径含news/资讯/报道，或内容含本报讯/记者 | 事件5W1H、时间线、影响 | events/ |
| **technical** (技术型) | 路径含tutorial/docs/教程，或内容含代码/API/配置 | 技术方案、最佳实践、陷阱 | techniques/ |

### 强制指定类型

```bash
wiki compile --type academic    # 强制学术型
wiki compile --type news        # 强制新闻型
wiki compile --type technical   # 强制技术型
wiki compile --force            # 强制重新编译所有文件
```

## 文件格式支持

| 格式 | 说明 | 转换方式 |
|------|------|----------|
| .md, .markdown | Markdown | 直接读取 |
| .txt | 纯文本 | 直接读取 |
| .pdf | PDF文档 | markitdown / pandoc 转换 |
| .docx | Word文档 | markitdown / pandoc 转换 |
| .pptx | PowerPoint | markitdown / pandoc 转换 |
| .xlsx, .xls | Excel表格 | markitdown / pandoc 转换 |
| .html, .htm | 网页 | 内置HTML转换器（自动去除广告/导航） |
| .epub | EPUB电子书 | markitdown / pandoc 转换 |
| .csv | CSV表格 | 内置CSV转Markdown表格 |
| .json | JSON数据 | 内置JSON格式化 |
| .xml | XML数据 | 需 markitdown / pandoc |

**自动转换机制**：
- 编译时自动检测非 Markdown 文件并转换为 Markdown
- 转换后的 Markdown 文件直接保存到 `raw/` 目录，与源文件同名（如 `文章.pdf` → `文章.md`）
- 已转换的文件会跳过后续编译，避免重复转换
- 源文件保留不变，不会被修改或删除
- 推荐安装 `markitdown` 获得最佳转换效果：`npm install -g markitdown`

## 文件限制

- 单文件大小 ≤ 200KB
- 单次编译文件数 ≤ 20个
- 总知识库规模 ≤ 500篇（推荐）

## Linting自动补全

运行 `wiki lint` 时，你读取 `prompts/lint.md` 并自动检查：
- **断裂链接**：`[[概念]]` 引用的文件不存在 → 自动创建空概念文件
- **孤立概念**：概念文件没有被任何文章引用 → 标记 ⚠️
- **冲突标记**：不同文献对同一概念描述矛盾 → 保持 ⚠️ 标记，需人工判断
- **覆盖度不足**：概念文件过于简略（<100字）→ 你调用自己的LLM能力扩展
- **时效性检查**：文档超过6个月未更新 → 标注 📅 待更新

## Git版本控制

- 初始化时自动 `git init`
- 编译后自动提交变更
- 支持 `wiki rollback` 回滚到任意历史版本
- 可选配置远程仓库同步

## 交互流程示例

### wiki compile

```
用户: wiki compile

AI: 📊 准备编译知识库...
    扫描 raw/ 目录...
    ✓ 发现 8 个文件
      • 新增: 5 个  • 修改: 2 个  • 未变: 1 个

    📋 待处理文件:
      1. article-attention.md (新增, 45KB)
      2. paper-transformer.md (新增, 120KB)
      ...

    ⏱️ 预计时间: 3-5 分钟
    开始编译? [Y/n]

用户: Y

AI: 🔄 正在编译知识库...

    [1/8] 研读 article-attention.md ...
          🏷️ 文档类型: academic
          [1/4] 提取关键要素...
              ✓ 识别 4 个概念, 2 个人物
          [2/4] 生成文章摘要...
              ✓ 生成摘要: 280 字
          [3/4] 撰写概念详细条目...
              ✓ 概念: 注意力机制 (450 字)
              ✓ 概念: Transformer (520 字)
              ✓ 人物: Vaswani (380 字)
          [4/4] 主题聚类与聚合页生成...
              ✓ 主题: 深度学习 (680 字)

    [进度条] ████████░░░░░░░░ 37% (3/8)
    ...

    ✓ 编译完成!
    📋 编译报告
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📥 输入统计
      • 处理文件: 5 个
      • 跳过文件: 1 个 (未变更)
      • 清洗脏数据: 0 个
      • 格式转换: 2 个文件

    📤 输出统计
      • 生成摘要: 5 篇
      • 提取概念: 12 个
      • 提取人物: 4 个
      • 生成主题: 3 个
      • 方法论: 2 个
      • 研究发现: 3 个
      • Wiki链接: 28 条
      • 移除无效链接: 1 个

    ⚠️ 问题发现
      • 编译失败: 0 个

    💡 建议
      • 请抽检 wiki/summaries/ 确认内容准确性
      • 运行 wiki lint 进行深度质量检查
      • 运行 wiki view 查看完整知识库
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ✓ 已自动提交Git
```

### wiki qa

**必须以 `wiki qa` 开头**，否则走LLM通用流程。

```
用户: wiki qa "Transformer和RNN的区别是什么？"

AI: 📚 正在从知识库中检索...
    • 匹配概念: transformer, rnn
    • 相关文章: 4 篇

    💡 基于知识库的回答:

    (answer strictly based on wiki content only)

    📖 参考来源:
      • wiki/concepts/transformer.md
      • wiki/concepts/rnn.md
```

如果知识库中没有相关内容：

```
AI: ❌ 知识库中暂无关于"BERT的预训练任务"的内容。
    💡 建议: 将相关文章保存到 raw/ 目录，然后运行 wiki compile
```

## 风险控制

| 风险 | 应对 |
|------|------|
| AI幻觉 | 定期人工审核，溯源到原文 |
| 错误累积 | Git版本控制，支持回滚 |
| 规模瓶颈 | 超1000篇建议改用RAG方案 |

## 配置文件

`~/.kb-config.json`:
```json
{
  "defaultPath": "D:\\knowledge-base",
  "llmModel": "qwen-plus"
}
```

`.kb-state.json` (知识库根目录下):
```json
{
  "version": 1,
  "lastCompile": "2026-04-17T10:30:00Z",
  "files": {
    "raw/article.md": {
      "mtime": 1713340200000,
      "hash": "abc123...",
      "wikiRefs": ["wiki/summaries/article.md"]
    }
  }
}
```

## 技术实现细节（供AI参考）

### 辅助工具

你可以使用以下 Node.js 工具辅助执行操作（但不用于 LLM 调用）：

```bash
# 文件扫描和转换
node index.js scan raw/          # 扫描 raw/ 目录，列出待处理文件

# Git操作
node index.js git log            # 查看Git历史
node index.js git diff [commit]  # 查看变更
node index.js git stash          # 暂存变更
node index.js git branch         # 查看/切换分支

# 远程同步
node index.js remote setup       # 配置远程
node index.js remote sync        # 同步

# 多知识库
node index.js kb list            # 列出知识库
node index.js kb add <n> <p>     # 注册
node index.js kb switch <name>   # 切换
node index.js kb remove <name>   # 移除
```

### Wikilink 验证

写入文件前，验证所有 `[[wikilink]]` 指向的文件是否存在：
- 有效：`wiki/concepts/`, `wiki/people/`, `wiki/summaries/`, `wiki/topics/` 下存在的 .md 文件
- 无效：移除 wikilink 格式，保留纯文本

### 增量编译

读取 `.kb-state.json`，对比文件 hash：
- hash 变化 → 重新编译
- hash 未变 → 跳过
- 文件删除 → 清理对应的 wiki/ 文件
