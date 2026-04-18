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

## 命令执行步骤（必须严格遵守）

**每个命令都必须按以下步骤实际执行，不能只输出文本而不执行操作**：

### wiki init（初始化知识库）- 必须执行的步骤

当用户请求 `wiki init [path]` 时，**你必须按顺序执行以下操作**：

1. **创建目录结构**（使用 Bash 命令）：
   ```bash
   mkdir -p <path>/raw
   mkdir -p <path>/wiki/summaries
   mkdir -p <path>/wiki/concepts
   mkdir -p <path>/wiki/people
   mkdir -p <path>/wiki/topics
   mkdir -p <path>/wiki/methods
   mkdir -p <path>/wiki/findings
   mkdir -p <path>/wiki/events
   mkdir -p <path>/wiki/techniques
   ```

2. **初始化 Git 仓库**（使用 Bash 命令）：
   ```bash
   cd <path>
   git init
   ```

3. **创建配置文件**（写入文件）：
   - `.kb-config.json`: 写入默认配置
   - `.kb-state.json`: 写入初始状态

4. **创建 .gitignore**（写入文件）：
   ```
   node_modules/
   .DS_Store
   ```

5. **Git 提交初始结构**（使用 Bash 命令）：
   ```bash
   git add .
   git commit -m "wiki: init - 初始化知识库结构"
   ```

**反馈示例**：
```
📚 personal-wiki 知识库编译器
    这个Skill可以帮你：
    1. 📥 收集原始文章到 raw/ 目录
    2. 🤖 AI自动研读并生成结构化笔记到 wiki/ 目录
    3. 💬 基于笔记进行深度问答学习

    📍 首先，知识库保存在哪个目录？
    [1] D:\knowledge-base (推荐)
    [2] 自定义路径

    请选择 (1/2) 或直接输入路径:

用户: 1

AI: 🔄 初始化知识库...
    📍 创建目录结构...
      ✅ D:\knowledge-base/raw/
      ✅ D:\knowledge-base/wiki/summaries/
      ✅ D:\knowledge-base/wiki/concepts/
      ✅ D:\knowledge-base/wiki/people/
      ✅ D:\knowledge-base/wiki/topics/
    📍 初始化Git仓库...
      ✓ git init 成功
    📍 创建配置文件...
      ✅ .kb-config.json
      ✅ .kb-state.json
    📍 Git 提交...
      ✓ Commit: abc1234 (wiki: init - 初始化知识库结构)

    ✅ 知识库初始化完成！
    📂 路径: D:\knowledge-base
    
    💡 下一步:
      • 将文章保存到 raw/ 目录
      • 运行 wiki compile 开始编译
```

### wiki compile（编译知识库）- 必须执行的步骤

当用户请求 `wiki compile` 时，**你必须按顺序执行以下操作**：

1. **读取编译规则**：
   - 读取 `prompts/compile.md`、`concept.md`、`person.md`、`topics.md`

2. **扫描 raw/ 目录**：
   ```bash
   ls raw/
   ```

3. **逐文件处理**（对每个文件）：
   - 读取文件内容
   - 提取概念、人物、主题
   - 生成摘要（写入 `wiki/summaries/`）
   - 生成概念条目（写入 `wiki/concepts/`）
   - 生成人物条目（写入 `wiki/people/`）

4. **更新索引和状态**：
   - 生成 `wiki/index.md`
   - 更新 `.kb-state.json`

5. **Git 提交**：
   ```bash
   git add .
   git commit -m "wiki: compile - X files, Y concepts, Z topics"
   ```

### wiki qa（问答）- 必须执行的步骤

当用户请求 `wiki qa "问题"` 时，**你必须按顺序执行以下操作**：

1. **扫描 wiki/ 目录**：
   ```bash
   ls wiki/concepts/ wiki/people/ wiki/summaries/
   ```

2. **读取相关文件**：
   - 根据问题关键词匹配概念文件
   - 读取匹配的 .md 文件内容

3. **基于内容回答**：
   - 严格基于 wiki/ 目录中的内容回答
   - 列出参考来源

### wiki lint（质量检查）- 必须执行的步骤

当用户请求 `wiki lint` 时，**你必须按顺序执行以下操作**：

1. **扫描所有 wiki/ 文件**：
   ```bash
   find wiki/ -name "*.md"
   ```

2. **检查断裂链接**：
   - 读取每个文件的 `[[wikilink]]`
   - 检查链接指向的文件是否存在
   - 如果不存在，创建空文件

3. **检查覆盖度**：
   - 统计每个概念文件的字数
   - 如果 <100 字，标记为覆盖度不足

4. **生成检查报告**

## 核心理念

- **用户收集**：将感兴趣的文章保存到 `raw/` 目录
- **AI编译**：**你（AI）作为资深学者**深入研读文章，生成结构化的 `wiki/` 目录
- **纯Markdown**：不依赖特定软件，Obsidian/VS Code/任意编辑器均可查看
- **本地优先**：所有数据在本地，Git版本控制
- **无需外部API**：**你直接生成内容**，不依赖 callLLM() 或外部 LLM API

## 执行反馈规范（重要 - 必须遵守）

**在执行编译任务时，你必须提供清晰、可视化的进度反馈**，让用户随时了解：
- 当前执行到哪一步
- 这一步的完成情况
- 整体进度百分比

### 反馈格式标准

#### 1. 阶段标识（每步开始时必须显示）

```
🔄 阶段 N/总阶段数: 阶段名称
```

例如：
```
🔄 阶段 1/5: 扫描 raw/ 目录
🔄 阶段 2/5: 识别文档类型
🔄 阶段 3/5: 研读并提取关键要素
🔄 阶段 4/5: 更新索引和状态
🔄 阶段 5/5: Git 提交变更
```

#### 2. 子阶段进度（每个子阶段必须显示）

```
  📍 子步骤: 描述...
    ✅ 完成: 结果
```

例如：
```
  📍 扫描 raw/ 目录...
    ✅ 发现 8 个文件
      • 新增: 5 个
      • 修改: 2 个
      • 未变: 1 个
      • 删除: 0 个
```

#### 3. 文件处理进度（每处理一个文件必须显示）

```
📄 [当前文件/总文件数] 文件名
  🏷️ 文档类型: 类型
  [1/4] 🔍 提取关键要素...
    ✅ 识别 X 个概念, Y 个人物, Z 个主题
  [2/4] 📝 生成文章摘要...
    ✅ 生成摘要: N 字
  [3/4] 📚 撰写详细条目...
    ✅ 概念: 概念名 (N 字)
    ✅ 人物: 人名 (N 字)
  [4/4] 🌐 主题聚合...
    ✅ 主题: 主题名 (N 字)
```

#### 4. 整体进度条（每处理完一个文件必须更新）

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 进度: ████████░░░░░░░░ 37% (3/8 文件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**进度条规则**：
- 总长度 16 个字符
- `█` 表示已完成，`░` 表示未完成
- 百分比 = (已完成文件数 / 总文件数) × 100%

#### 5. 完成报告（全部处理完后必须显示）

```
✅ 编译完成！

📋 编译报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 输入统计
  • 处理文件: X 个
  • 跳过文件: Y 个 (未变更)
  • 清洗脏数据: Z 个
  • 格式转换: N 个文件

📤 输出统计
  • 生成摘要: X 篇
  • 提取概念: Y 个
  • 提取人物: Z 个
  • 生成主题: N 个
  • 方法论: A 个
  • 研究发现: B 个
  • 新闻事件: C 个
  • 技术方案: D 个
  • Wiki链接: E 条
  • 移除无效链接: F 个

⚠️ 问题发现
  • 编译失败: G 个
  • (如有失败，列出具体文件和错误)

💡 建议
  • 请抽检 wiki/summaries/ 确认内容准确性
  • 运行 wiki lint 进行深度质量检查
  • 运行 wiki view 查看完整知识库

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 已自动提交Git
```

### Emoji 使用规范

**阶段标识**：
- 🔄 执行中
- ✅ 完成
- ❌ 失败
- ⚠️ 警告
- 💡 建议
- 📊 统计
- 📄 文件
- 📍 子步骤
- 🏷️ 标签
- 🔍 提取
- 📝 生成
- 📚 撰写
- 🌐 聚合
- 📥 输入
- 📤 输出

**状态标识**：
- ✓ 成功
- ✗ 失败
- ⚡ 快速完成
- ⏳ 等待中

### 反馈时机

**必须立即反馈**：
1. 开始每个阶段时
2. 完成每个子步骤时
3. 处理完每个文件后
4. 遇到错误或警告时
5. 整体编译完成时

**可选反馈**：
- 处理大型文件时（>100KB），每完成 25% 进度可显示一次
- 批量操作时（如创建多个概念文件），每 5 个显示一次汇总

## 编译执行流程（重要）

当用户请求 `wiki compile` 时，**你必须按以下步骤执行**：

### Step 0: 读取编译规则

🔄 阶段 0/5: 读取编译规则

首先读取以下文件，理解编译规则：
1. `prompts/compile.md` - 通用编译规则
2. `prompts/concept.md` - 概念条目格式
3. `prompts/person.md` - 人物条目格式
4. `prompts/topics.md` - 主题聚合格式

如果文章是特定类型，额外读取：
- 学术型：`prompts/compile-academic.md`, `prompts/summary-academic.md`, `prompts/method.md`, `prompts/finding.md`
- 新闻型：`prompts/compile-news.md`, `prompts/summary-news.md`, `prompts/event.md`
- 技术型：`prompts/compile-tech.md`, `prompts/summary-tech.md`, `prompts/technique.md`

**反馈示例**：
```
🔄 阶段 0/5: 读取编译规则
  📍 读取通用编译模板...
    ✅ compile.md (2.6KB)
    ✅ concept.md (4.6KB)
    ✅ person.md (4.1KB)
    ✅ topics.md (5.1KB)
  📍 检测文档类型模板...
    ✅ 发现学术型模板: compile-academic.md, summary-academic.md
```

### Step 1: 扫描 raw/ 目录

🔄 阶段 1/5: 扫描 raw/ 目录

```bash
ls raw/
```

获取所有待处理的文章列表（支持 .md, .pdf, .docx, .epub, .html, .csv, .json 等格式）。

**反馈示例**：
```
🔄 阶段 1/5: 扫描 raw/ 目录
  📍 扫描 raw/ 目录...
    ✅ 发现 8 个文件
      • 新增: 5 个
      • 修改: 2 个
      • 未变: 1 个
      • 删除: 0 个

  📋 待处理文件:
    1. article-attention.md (新增, 45KB)
    2. paper-transformer.md (新增, 120KB)
    3. news-ai-regulation.md (新增, 32KB)
    4. tutorial-pytorch.md (新增, 67KB)
    5. research-llm.md (新增, 89KB)
    6. old-article.md (修改, 28KB)
    7. updated-notes.md (修改, 15KB)

  ⏱️ 预计时间: 3-5 分钟
  开始编译? [Y/n]
```

### Step 2: 识别文档类型

🔄 阶段 2/5: 识别文档类型

对每篇文章，判断其类型：
- **narrative**（叙事型）：默认类型
- **academic**（学术型）：路径含 papers/research/论文，或内容含摘要/参考文献/实验
- **news**（新闻型）：路径含 news/资讯/报道，或内容含本报讯/记者
- **technical**（技术型）：路径含 tutorial/docs/教程，或内容含代码/API/配置

用户可用 `--type <类型>` 强制指定，或用 `--force` 强制重新编译所有。

**反馈示例**：
```
🔄 阶段 2/5: 识别文档类型
  📍 分析文件类型...
    ✅ article-attention.md → academic (路径含 research)
    ✅ paper-transformer.md → academic (内容含摘要/参考文献)
    ✅ news-ai-regulation.md → news (路径含 news)
    ✅ tutorial-pytorch.md → technical (路径含 tutorial)
    ✅ research-llm.md → academic (路径含 research)
    ✅ old-article.md → narrative (默认)
    ✅ updated-notes.md → narrative (默认)
```

### Step 3: 研读并提取（四阶段编译）

🔄 阶段 3/5: 研读并提取关键要素

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

**完整反馈示例**（处理单个文件）：
```
📄 [1/7] article-attention.md
  🏷️ 文档类型: academic
  [1/4] 🔍 提取关键要素...
    ✅ 识别 4 个概念: 注意力机制, Transformer, Self-Attention, Multi-Head Attention
    ✅ 识别 2 个人物: Vaswani, Bahdanau
    ✅ 识别 3 个主题: 深度学习，自然语言处理，序列模型
  [2/4] 📝 生成文章摘要...
    ✅ 生成摘要: 280 字 → wiki/summaries/article-attention.md
  [3/4] 📚 撰写详细条目...
    ✅ 概念: 注意力机制 (520 字) → wiki/concepts/注意力机制.md
    ✅ 概念: Transformer (480 字) → wiki/concepts/Transformer.md
    ✅ 概念: Self-Attention (450 字) → wiki/concepts/Self-Attention.md
    ✅ 概念: Multi-Head Attention (430 字) → wiki/concepts/Multi-Head-Attention.md
    ✅ 人物: Vaswani (380 字) → wiki/people/Vaswani.md
    ✅ 人物: Bahdanau (350 字) → wiki/people/Bahdanau.md
  [4/4] 🌐 主题聚合...
    ⏳ 等待所有文件处理完后统一执行
```

**进度条更新**（每处理完一个文件）：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 进度: ██░░░░░░░░░░░░░░ 14% (1/7 文件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: 更新索引和状态

🔄 阶段 4/5: 更新索引和状态

生成 `wiki/index.md` 全局索引，更新 `.kb-state.json` 编译状态。

**反馈示例**：
```
🔄 阶段 4/5: 更新索引和状态
  📍 生成全局索引...
    ✅ wiki/index.md (1.2KB)
  📍 更新编译状态...
    ✅ .kb-state.json (更新 7 个文件记录)
```

### Step 5: Git 提交

🔄 阶段 5/5: Git 提交变更

自动提交变更：
```bash
git add .
git commit -m "wiki: compile - X files, Y concepts, Z topics"
```

**反馈示例**：
```
🔄 阶段 5/5: Git 提交变更
  📍 提交变更...
    ✅ git add . (添加 15 个文件)
    ✅ git commit -m "wiki: compile - 7 files, 18 concepts, 4 topics"
    ✓ Commit: abc1234
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

### wiki compile（完整反馈示例）

```
用户: wiki compile

AI: 🔄 阶段 0/5: 读取编译规则
    📍 读取通用编译模板...
      ✅ compile.md (2.6KB)
      ✅ concept.md (4.6KB)
      ✅ person.md (4.1KB)
      ✅ topics.md (5.1KB)
    📍 检测文档类型模板...
      ✅ 发现学术型模板: compile-academic.md, summary-academic.md, method.md, finding.md
      ✅ 发现新闻型模板: compile-news.md, summary-news.md, event.md
      ✅ 发现技术型模板: compile-tech.md, summary-tech.md, technique.md

🔄 阶段 1/5: 扫描 raw/ 目录
    📍 扫描 raw/ 目录...
      ✅ 发现 8 个文件
        • 新增: 5 个
        • 修改: 2 个
        • 未变: 1 个
        • 删除: 0 个

    📋 待处理文件:
      1. article-attention.md (新增, 45KB)
      2. paper-transformer.md (新增, 120KB)
      3. news-ai-regulation.md (新增, 32KB)
      4. tutorial-pytorch.md (新增, 67KB)
      5. research-llm.md (新增, 89KB)
      6. old-article.md (修改, 28KB)
      7. updated-notes.md (修改, 15KB)

    ⏱️ 预计时间: 3-5 分钟
    开始编译? [Y/n]

用户: Y

AI: 🔄 阶段 2/5: 识别文档类型
    📍 分析文件类型...
      ✅ article-attention.md → academic (路径含 research)
      ✅ paper-transformer.md → academic (内容含摘要/参考文献)
      ✅ news-ai-regulation.md → news (路径含 news)
      ✅ tutorial-pytorch.md → technical (路径含 tutorial)
      ✅ research-llm.md → academic (路径含 research)
      ✅ old-article.md → narrative (默认)
      ✅ updated-notes.md → narrative (默认)

🔄 阶段 3/5: 研读并提取关键要素

📄 [1/7] article-attention.md
  🏷️ 文档类型: academic
  [1/4] 🔍 提取关键要素...
    ✅ 识别 4 个概念: 注意力机制, Transformer, Self-Attention, Multi-Head Attention
    ✅ 识别 2 个人物: Vaswani, Bahdanau
    ✅ 识别 3 个主题: 深度学习，自然语言处理，序列模型
  [2/4] 📝 生成文章摘要...
    ✅ 生成摘要: 280 字 → wiki/summaries/article-attention.md
  [3/4] 📚 撰写详细条目...
    ✅ 概念: 注意力机制 (520 字) → wiki/concepts/注意力机制.md
    ✅ 概念: Transformer (480 字) → wiki/concepts/Transformer.md
    ✅ 概念: Self-Attention (450 字) → wiki/concepts/Self-Attention.md
    ✅ 概念: Multi-Head Attention (430 字) → wiki/concepts/Multi-Head-Attention.md
    ✅ 人物: Vaswani (380 字) → wiki/people/Vaswani.md
    ✅ 人物: Bahdanau (350 字) → wiki/people/Bahdanau.md
  [4/4] 🌐 主题聚合...
    ⏳ 等待所有文件处理完后统一执行

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 进度: ██░░░░░░░░░░░░░░ 14% (1/7 文件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 [2/7] paper-transformer.md
  🏷️ 文档类型: academic
  [1/4] 🔍 提取关键要素...
    ✅ 识别 5 个概念: Positional Encoding, Layer Normalization, Residual Connection, Decoder, Encoder
    ✅ 识别 1 个人物: Ilya Sutskever
    ✅ 识别 2 个主题: 序列到序列模型，机器翻译
  [2/4] 📝 生成文章摘要...
    ✅ 生成摘要: 310 字 → wiki/summaries/paper-transformer.md
  [3/4] 📚 撰写详细条目...
    ✅ 概念: Positional Encoding (460 字) → wiki/concepts/Positional-Encoding.md
    ✅ 概念: Layer Normalization (420 字) → wiki/concepts/Layer-Normalization.md
    ✅ 概念: Residual Connection (390 字) → wiki/concepts/Residual-Connection.md
    ✅ 概念: Decoder (440 字) → wiki/concepts/Decoder.md
    ✅ 概念: Encoder (410 字) → wiki/concepts/Encoder.md
    ✅ 人物: Ilya Sutskever (360 字) → wiki/people/Ilya-Sutskever.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 进度: ████░░░░░░░░░░░░ 29% (2/7 文件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

... (继续处理剩余文件)

📄 [7/7] updated-notes.md
  🏷️ 文档类型: narrative
  [1/4] 🔍 提取关键要素...
    ✅ 识别 2 个概念: 知识管理，个人成长
    ✅ 识别 1 个人物: 卡尔·纽波特
  [2/4] 📝 生成文章摘要...
    ✅ 生成摘要: 240 字 → wiki/summaries/updated-notes.md
  [3/4] 📚 撰写详细条目...
    ✅ 概念: 知识管理 (380 字) → wiki/concepts/知识管理.md
    ✅ 概念: 个人成长 (350 字) → wiki/concepts/个人成长.md
    ✅ 人物: 卡尔·纽波特 (320 字) → wiki/people/卡尔·纽波特.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 进度: ████████████████ 100% (7/7 文件)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 阶段 4/5: 更新索引和状态
    📍 生成全局索引...
      ✅ wiki/index.md (2.8KB)
    📍 更新编译状态...
      ✅ .kb-state.json (更新 7 个文件记录)

🔄 阶段 5/5: Git 提交变更
    📍 提交变更...
      ✅ git add . (添加 32 个文件)
      ✅ git commit -m "wiki: compile - 7 files, 24 concepts, 6 topics"
      ✓ Commit: abc1234

✅ 编译完成！

📋 编译报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 输入统计
  • 处理文件: 7 个
  • 跳过文件: 1 个 (未变更)
  • 清洗脏数据: 0 个
  • 格式转换: 0 个文件

📤 输出统计
  • 生成摘要: 7 篇
  • 提取概念: 24 个
  • 提取人物: 6 个
  • 生成主题: 4 个
  • 方法论: 3 个
  • 研究发现: 5 个
  • 新闻事件: 2 个
  • 技术方案: 4 个
  • Wiki链接: 56 条
  • 移除无效链接: 0 个

⚠️ 问题发现
  • 编译失败: 0 个

💡 建议
  • 请抽检 wiki/summaries/ 确认内容准确性
  • 运行 wiki lint 进行深度质量检查
  • 运行 wiki view 查看完整知识库

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

## 全功能执行反馈规范（必须遵守）

**所有 wiki 命令在执行时都必须提供清晰、可视化的进度反馈**。以下是每个命令的标准反馈格式。

### 1. wiki init（初始化知识库）

```
用户: wiki init

AI: 📚 personal-wiki 知识库编译器
    这个Skill可以帮你：
    1. 📥 收集原始文章到 raw/ 目录
    2. 🤖 AI自动研读并生成结构化笔记到 wiki/ 目录
    3. 💬 基于笔记进行深度问答学习

    📍 首先，知识库保存在哪个目录？
    [1] D:\knowledge-base (推荐)
    [2] 自定义路径

    请选择 (1/2) 或直接输入路径:

用户: 1

AI: 🔄 初始化知识库...
    📍 创建目录结构...
      ✅ knowledge-base/raw/
      ✅ knowledge-base/wiki/summaries/
      ✅ knowledge-base/wiki/concepts/
      ✅ knowledge-base/wiki/people/
      ✅ knowledge-base/wiki/topics/
    📍 初始化Git仓库...
      ✓ git init 成功
    📍 创建配置文件...
      ✅ .kb-config.json
      ✅ .kb-state.json

    ✅ 知识库初始化完成！
    📂 路径: D:\knowledge-base
    
    💡 下一步:
      • 将文章保存到 raw/ 目录
      • 运行 wiki compile 开始编译
```

### 2. wiki clean（清洗脏数据）

```
用户: wiki clean article.md

AI: 🔄 清洗脏数据...
    📍 读取文件...
      ✅ article.md (45KB)
    📍 检测脏数据...
      ⚠️ 发现 HTML 标签残留
      ⚠️ 发现乱码字符
      ⚠️ 发现空段落
    📍 清洗数据...
      ✅ 移除 HTML 标签 (12 处)
      ✅ 修复乱码 (8 处)
      ✅ 合并空段落 (5 处)
    📍 保存清洗后文件...
      ✅ article.md (42KB, 减少 3KB)

    ✅ 数据清洗完成！
    📊 清洗统计:
      • 处理文件: 1 个
      • 移除 HTML: 12 处
      • 修复乱码: 8 处
      • 合并段落: 5 处
```

### 3. wiki lint（质量检查）

```
用户: wiki lint

AI: 🔄 质量检查...
    📍 扫描 wiki/ 目录...
      ✅ 发现 45 个文件
        • summaries: 12 篇
        • concepts: 24 个
        • people: 6 个
        • topics: 3 个

    📍 检查断裂链接...
      ✅ 检查 156 个 wikilink
      ⚠️ 发现 3 个断裂链接:
        • [[机器学习基础]] (wiki/concepts/深度学习.md)
        • [[Vaswani]] (wiki/concepts/Attention.md)
        • [[强化学习]] (wiki/topics/AI.md)
      📍 自动创建空概念文件...
        ✅ wiki/concepts/机器学习基础.md
        ✅ wiki/people/Vaswani.md
        ✅ wiki/concepts/强化学习.md

    📍 检查孤立概念...
      ✅ 所有概念文件均被引用

    📍 检查覆盖度...
      ⚠️ 发现 2 个概念文件过于简略 (<100字):
        • wiki/concepts/正则化.md (68字)
        • wiki/concepts/损失函数.md (82字)
      📍 自动扩展概念...
        ✅ 正则化.md (68字 → 320字)
        ✅ 损失函数.md (82字 → 280字)

    📍 检查时效性...
      📅 发现 1 个文档超过6个月未更新:
        • wiki/concepts/RNN.md (最后更新: 2025-09-15)

    ✅ 质量检查完成！
    📋 检查报告
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📊 文件统计
      • 总文件: 45 个
      • 总wikilink: 156 条
    
    ⚠️ 问题发现
      • 断裂链接: 3 个 (已自动修复)
      • 孤立概念: 0 个
      • 覆盖度不足: 2 个 (已自动扩展)
      • 时效性警告: 1 个
    
    💡 建议
      • 请检查新创建的空概念文件并补充内容
      • 考虑更新 RNN.md 以反映最新进展
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. wiki qa（问答）

```
用户: wiki qa "Transformer和RNN的区别是什么？"

AI: 📚 正在从知识库中检索...
    📍 匹配概念...
      ✅ transformer (wiki/concepts/Transformer.md)
      ✅ rnn (wiki/concepts/RNN.md)
      ✅ 注意力机制 (wiki/concepts/注意力机制.md)
    📍 匹配文章...
      ✅ article-attention.md (相关度: 92%)
      ✅ paper-transformer.md (相关度: 88%)
      ✅ research-llm.md (相关度: 75%)
      ✅ old-article.md (相关度: 60%)

    💡 基于知识库的回答:

    Transformer 和 RNN 是两种不同的序列建模架构，主要区别如下：

    **1. 处理方式**
    - RNN: 顺序处理，每一步依赖上一步的隐藏状态
    - Transformer: 并行处理，通过自注意力机制同时处理所有位置

    **2. 长距离依赖**
    - RNN: 长距离信息传递困难，存在梯度消失问题
    - Transformer: 自注意力机制直接建模任意位置间的依赖关系

    **3. 训练效率**
    - RNN: 无法并行化，训练速度慢
    - Transformer: 完全并行化，训练效率高

    **4. 应用场景**
    - RNN: 适合实时流式处理、语音识别
    - Transformer: 适合机器翻译、文本生成、图像理解

    📖 参考来源:
      • wiki/concepts/Transformer.md
      • wiki/concepts/RNN.md
      • wiki/concepts/注意力机制.md
      • wiki/summaries/article-attention.md
```

**无内容时**：
```
用户: wiki qa "BERT的预训练任务是什么？"

AI: 📚 正在从知识库中检索...
    📍 匹配概念...
      ❌ 未找到 BERT 相关概念
    📍 匹配文章...
      ❌ 未找到 BERT 相关文章

    ❌ 知识库中暂无关于"BERT的预训练任务"的内容。
    
    💡 建议:
      • 将 BERT 相关文章保存到 raw/ 目录
      • 运行 wiki compile 进行编译
      • 重新提问
```

### 5. wiki status（查看状态）

```
用户: wiki status

AI: 📊 知识库状态
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    📂 基本信息
      • 路径: D:\knowledge-base
      • 最后编译: 2026-04-18 17:30
      • Git 分支: main
      • 最新提交: wiki: compile - 7 files, 24 concepts, 6 topics
    
    📥 raw/ 目录
      • 文件数: 8 个
      • 总大小: 456 KB
      • 支持格式: md(5), pdf(2), epub(1)
    
    📤 wiki/ 目录
      • summaries: 12 篇
      • concepts: 24 个
      • people: 6 个
      • topics: 3 个
      • methods: 5 个
      • findings: 8 个
      • 总wikilink: 156 条
    
    📈 编译统计
      • 已编译: 7 个文件
      • 未编译: 1 个文件
      • 脏数据: 0 个
      • 断裂链接: 0 个
    
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6. wiki view（查看知识库）

```
用户: wiki view

AI: 📖 知识库索引
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    ## 核心主题
    - [[深度学习]] - 神经网络在复杂模式识别中的应用
    - [[自然语言处理]] - AI处理和理解人类语言的技术
    - [[强化学习]] - 通过奖励机制学习最优策略
    - [[计算机视觉]] - 让机器理解和生成图像
    
    ## 文章摘要
    - [[article-attention]] - 注意力机制在序列模型中的应用
    - [[paper-transformer]] - Attention Is All You Need 论文解读
    - [[news-ai-regulation]] - AI监管政策最新动态
    - [[tutorial-pytorch]] - PyTorch实战教程
    - [[research-llm]] - 大语言模型研究综述
    
    ## 概念
    - [[注意力机制]], [[Transformer]], [[Self-Attention]], [[Multi-Head Attention]]
    - [[Positional Encoding]], [[Layer Normalization]], [[Residual Connection]]
    - [[RNN]], [[LSTM]], [[GRU]], [[CNN]]
    - ... (共24个概念)
    
    ## 人物
    - [[Vaswani]] - Transformer论文第一作者
    - [[Bahdanau]] - 注意力机制提出者
    - [[Ilya Sutskever]] - OpenAI联合创始人
    - ... (共6个人物)
    
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    💡 提示:
      • 点击链接可查看详细内容
      • 运行 wiki qa "问题" 进行深度问答
```

### 7. wiki git（Git操作）

```
用户: wiki git log

AI: 📜 Git 历史记录
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    * abc1234 (HEAD -> main) - 2026-04-18 17:30
      wiki: compile - 7 files, 24 concepts, 6 topics
      作者: AI Assistant
    
    * def5678 - 2026-04-17 14:20
      wiki: compile - 3 files, 8 concepts, 2 topics
      作者: AI Assistant
    
    * ghi9012 - 2026-04-16 10:15
      wiki: init - 初始化知识库
      作者: User
    
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    💡 提示:
      • 运行 wiki rollback <commit> 回滚到指定版本
      • 运行 wiki git diff <commit> 查看变更详情
```

### 8. wiki remote（远程同步）

```
用户: wiki remote sync

AI: 🔄 同步远程变更...
    📍 检查远程仓库...
      ✅ origin: https://github.com/user/knowledge-base.git
    📍 拉取远程变更...
      ✅ 发现 2 个新提交
      • abc1234: wiki: compile - 3 files, 8 concepts
      • def5678: Update article-attention.md
    📍 合并变更...
      ✅ 自动合并成功
      • 更新文件: 3 个
      • 新增文件: 8 个
    
    ✅ 同步完成！
    📊 同步统计:
      • 拉取提交: 2 个
      • 更新文件: 3 个
      • 新增文件: 8 个
      • 冲突: 0 个
```

### 9. wiki kb（多知识库管理）

```
用户: wiki kb list

AI: 📚 已注册的知识库
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    * ai-notes (默认)
      路径: D:\knowledge-base\ai
      文件数: 45 个
      最后编译: 2026-04-18 17:30
    
    * code-notes
      路径: D:\knowledge-base\code
      文件数: 28 个
      最后编译: 2026-04-17 10:20
    
    * research
      路径: D:\knowledge-base\research
      文件数: 67 个
      最后编译: 2026-04-16 15:45
    
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    💡 提示:
      • 运行 wiki kb switch <name> 切换默认知识库
      • 运行 wiki compile --kb <name> 编译指定知识库
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
