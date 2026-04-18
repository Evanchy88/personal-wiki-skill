---
name: personal-wiki
description: |
  个人知识库编译器。当用户提到以下任何内容时自动触发：
  - "wiki init"、"wiki compile"、"wiki status"、"wiki qa"、"wiki lint" 等 wiki 命令
  - 知识库编译、编译进度、断点续传、继续编译
  - raw/ 目录、wiki/ 目录、知识条目、概念提取、人物条目
  - .kb-state.json、编译状态、中断恢复
  功能：AI 直接研读文章并整理成结构化知识体系，支持分批编译、断点续传、Git 版本控制。
---

# personal-wiki

## 跨平台使用说明

**本 Skill 符合 Agent Skills 开放标准**，可在 Qoder、Copaw、Claude、Cursor 等所有支持 SKILL.md 的 AI 平台运行。

### 安装位置
将 `personal-wiki/` 目录放置到 AI 平台的 skills 目录：
- **Qoder**: `~/.qoder/skills/personal-wiki/`
- **Copaw**: `~/.lingma/skills/personal-wiki/`
- **Claude**: `~/.claude/skills/personal-wiki/`
- **Cursor**: `.cursor/skills/personal-wiki/`

### 触发方式
当用户输入包含以下关键词时，AI **自动加载并执行**本 Skill：
- `wiki init [path]` → 初始化知识库
- `wiki compile` → 编译知识库（支持断点续传）
- `wiki status` → 查看编译进度
- `wiki qa "问题"` → 检索知识库
- `wiki lint` → 质量检查
- 或者提到"知识库编译"、"编译进度"、"继续编译"等

### 核心原则
1. **AI 作为编译引擎**：不再调用外部脚本，AI 亲自读取、分析、生成
2. **强制状态检查**：任何操作前必须先读取 `.kb-state.json`
3. **断点续传**：支持中断后恢复，保留完整编译策略上下文
4. **Git 版本控制**：每次编译自动提交

---

基于Karpathy理念的个人知识库编译器。**你（AI）直接作为编译引擎**，研读用户收集的文章，整理成结构化的知识体系。

## 核心架构

**你不再执行 `node index.js compile`**，而是：
1. 读取 `prompts/` 目录下的编译模板，理解规则
2. 扫描 `raw/` 目录，获取待处理文章
3. **你亲自研读每篇文章**，提取概念、人物、主题
4. **你亲自生成摘要和概念条目**，按照 prompt 模板的格式
5. **你亲自写入 `wiki/` 目录**，建立交叉引用

## ⚠️ 强制规则：任何知识库操作前必须检查编译状态

**重要：当用户提到知识库路径、询问编译进度、或请求任何 wiki 命令时，你必须：**

### 第一步：读取并解析 `.kb-state.json`

1. **立即读取 `.kb-state.json`**（这是强制性第一步）
2. **检测文件格式版本**：

   **新版格式（推荐）**：
   ```json
   {
     "compileState": {
       "status": "idle" | "interrupted" | "completed",
       "strategy": {
         "batchSize": 3,           // 每批编译文件数
         "userChoice": 1,          // 用户选择：1=继续全部，2=暂停
         "totalBatches": 5,        // 总批次数
         "currentBatch": 2         // 当前进行到第几批
       },
       "compiledFiles": ["file1.md", "file2.epub"],  // 已完成的文件列表
       "pendingFiles": ["file3.md", "file4.epub"],   // 待编译文件列表
       "totalFiles": 14,           // 文件总数
       "lastBatch": 2,             // 最后一批编号
       "stats": {                  // 统计信息
         "concepts": 25,
         "people": 42,
         "topics": 3,
         "summaries": 1
       }
     }
   }
   ```

   **旧版格式（兼容）**：
   ```json
   {
     "files": {
       "file1.md": { "compiled": true, "concepts": [...], "people": [...] }
     }
   }
   ```

3. **根据格式检查编译状态**：

   **如果是新版格式**：
   - 检查 `compileState.status` 字段：
     - `"idle"` → 正常状态，无中断
     - `"interrupted"` → **必须立即提示续编**（这是关键！）
     - `"completed"` → 编译已完成

   **如果是旧版格式（没有 compileState 字段）**：
   - 统计 `files` 中 `compiled: true` 的文件数 = 已编译数
   - 扫描 `raw/` 目录获取总文件数
   - **待编译数 = 总数 - 已编译数**
   - 如果待编译数 > 0，说明**编译未完成**，必须提示续编：

   ```
   ⚠️ 检测到知识库编译未完成！

   编译状态（旧版格式）：
     • 已编译: X 个文件
     • 待编译: Y 个文件
     • 已生成: A 概念, B 人物, C 主题

   剩余待编译文件：
     • <filename1>
     • <filename2>
     ...

   是否继续编译剩余文件？
   [1] 是，继续编译（推荐）
   [2] 否，只查看完整状态

   请选择 (1/2):
   ```

### 第二步：统计知识条目数量

无论哪种格式，都需要统计实际生成的知识条目：
- 扫描 `wiki/concepts/` 目录 → 概念数
- 扫描 `wiki/people/` 目录 → 人物数
- 扫描 `wiki/topics/` 目录 → 主题数
- 扫描 `wiki/summaries/` 目录 → 摘要数

### 第三步：根据状态提示用户

**如果检测到未完成编译**：
1. 显示已编译文件和待编译文件列表
2. 显示已生成的知识条目统计
3. **强制提示续编选项**

**禁止行为**：
- ❌ 禁止跳过 `.kb-state.json` 直接扫描 raw/ 目录
- ❌ 禁止看到有 wiki/ 文件就认为编译完成
- ❌ 禁止忽略未完成的编译状态（无论新旧格式）
- ❌ 禁止不统计实际生成的知识条目数
- ✅ 必须每次对话都检查 `.kb-state.json`
- ✅ 必须兼容新旧两种文件格式
- ✅ 必须统计实际生成的知识条目（concepts/people/topics/summaries）

## 如何使用

当用户输入包含以下关键词时，**你直接执行相应操作**：

| 命令 | 操作 |
|------|------|
| `wiki init` | 创建目录结构 + Git 初始化 |
| `wiki compile` | 研读文章 → 生成 wiki 内容 |
| `wiki qa "问题"` | 在 wiki/ 中检索 → 回答 |
| `wiki lint` | 检查链接、覆盖度、时效性 |
| `wiki status` | 显示统计信息 |
| `wiki view` | 显示知识库索引 |
| `wiki git ...` | Git 操作 |

## 重要：路径和工具

**⚠️ 这不是命令行工具，AI 直接执行所有操作**

**不要执行 `node index.js` 或任何命令行工具**。你是编译引擎，亲自完成所有工作：
- 读取文件内容 → 使用 Read 工具
- 分析文章 → 你亲自理解
- 生成知识条目 → 你亲自撰写
- 写入 wiki 目录 → 使用 Write 工具
- Git 操作 → 使用 Bash 执行 git 命令

**Prompt 模板位置**（如果存在）：
- `prompts/compile.md` - 编译规则
- `prompts/concept.md` - 概念条目格式
- `prompts/person.md` - 人物条目格式
- `prompts/topics.md` - 主题条目格式
- **使用相对路径读取 prompt 文件**（相对于 SKILL.md 所在目录）

**知识库路径**：
- 用户指定路径（如 `D:\Wiki\读书`）
- 默认：`D:\knowledge-base`

**执行工具**：
- 创建目录：`Bash` → `mkdir -p`
- 写入文件：`Write` 工具
- 读取文件：`Read` 工具
- Git 操作：`Bash` → `git`
- 扫描目录：`Bash` → `ls` / `find`

## wiki init 执行步骤

当用户请求 `wiki init [path]` 时：

1. **确定路径**：从用户消息提取，或默认 `D:\knowledge-base`
2. **创建目录**（Bash）：
   ```bash
   mkdir -p <kbPath>/raw <kbPath>/wiki/{summaries,concepts,people,topics,methods,findings,events,techniques}
   ```
3. **创建配置**（Write）：
   - `.kb-config.json`: `{"defaultPath":"<kbPath>","llmModel":"qwen-plus"}`
   - `.kb-state.json`: `{"version":1,"lastCompile":null,"files":{},"compileState":{"status":"idle","compiledFiles":[],"totalFiles":0,"lastBatch":0}}`
   - `.gitignore`: `node_modules/\n.DS_Store`
4. **初始化 Git**（Bash）：
   ```bash
   cd <kbPath> && git init
   ```
5. **检查 Git 身份**（Bash）：
   ```bash
   git config user.name && git config user.email
   ```
   - ✅ 已配置 → 直接提交
   - ❌ 未配置 → 用 `git -c user.name="wiki-user" -c user.email="wiki@local"` 提交（本地提交不需要真实身份）
6. **Git 提交**（Bash）：
   ```bash
   cd <kbPath> && git add . && git commit -m "wiki: init"
   ```
7. **不要求配置远程**：远程推送是可选的，后续用户可通过 `wiki git remote setup` 配置

**反馈格式**：
```
📚 personal-wiki 知识库编译器
📍 确认知识库路径: <kbPath>
🔄 初始化知识库...
  📍 创建目录结构... ✅
  📍 创建配置文件... ✅
  📍 初始化Git仓库... ✅
  📍 Git 提交... ✅ (本地提交，远程推送可选)
✅ 知识库初始化完成！📂 <kbPath>
💡 下一步: 将文章保存到 raw/ 目录，运行 wiki compile
💡 Git版本控制: 本地已启用，远程推送可选配置
```

## wiki compile 执行步骤

当用户请求 `wiki compile` 时：

1. **读取编译规则**（Read）：`prompts/compile.md`, `concept.md`, `person.md`, `topics.md`
2. **读取编译状态**（Read）：`.kb-state.json`，检查 `compileState` 字段
   - 如果 `compileState.status === "interrupted"`，提示用户：
     ```
     ⚠️ 检测到上次编译中断，剩余 X 个文件未处理
     是否继续上次的进度？
     [1] 是，继续上次中断的编译
     [2] 否，重新开始全量编译
     ```
3. **扫描 raw/ 目录**（Bash）：`ls <kbPath>/raw/`
4. **筛选待编译文件**：
   - 如果是续编：跳过 `compileState.compiledFiles` 中已完成的文件
   - 如果是全新编译：处理所有文件
5. **统计文件数量**，决定编译策略：
   - **1-3 个文件**：直接全部编译，设置 `batchSize = N`, `totalBatches = 1`
   - **4+ 个文件**：先编译第一批（1-3个），设置 `batchSize = 3`, `totalBatches = Math.ceil(总数 / 3)`

6. **编译第一批文件**（Read + Write）：
   - 读取文件内容
   - 提取概念、人物、主题（生成 JSON）
   - 生成摘要 → `wiki/summaries/`
   - 生成概念条目 → `wiki/concepts/`
   - 生成人物条目 → `wiki/people/`
   
7. **更新编译状态**（Write）：**这是关键步骤，必须保存完整策略信息**
   ```javascript
   // 计算统计信息
   const conceptsCount = (Bash: ls wiki/concepts/).split('\n').length;
   const peopleCount = (Bash: ls wiki/people/).split('\n').length;
   const topicsCount = (Bash: ls wiki/topics/).split('\n').length;
   const summariesCount = (Bash: ls wiki/summaries/).split('\n').length;
   
   // 写入 .kb-state.json
   {
     "compileState": {
       "status": "interrupted",  // 如果未完成
       "strategy": {
         "batchSize": 3,         // 当前批次大小
         "userChoice": 0,        // 0=未选择，1=继续全部，2=暂停
         "totalBatches": 5,      // 总批次数
         "currentBatch": 1       // 当前批次号（从1开始）
       },
       "compiledFiles": [...],   // 已完成的文件列表
       "pendingFiles": [...],    // 待编译文件列表（重要！）
       "totalFiles": 14,
       "lastBatch": 1,
       "stats": {
         "concepts": conceptsCount,
         "people": peopleCount,
         "topics": topicsCount,
         "summaries": summariesCount
       }
     }
   }
   ```
8. **Git 提交**（Bash）：`git add . && git commit -m "wiki: compile batch X/Y"`

9. **如果还有待编译文件，暂停并询问用户**：
   - 计算总批次数：`总批次数 = Math.ceil(剩余数 / 3)`
   ```
   ✅ 第 M/总批次数 批编译完成！
   📊 总进度: X/N 文件已处理 (剩余 剩余批次 批)
   📋 累计生成: A 概念, B 人物, C 摘要
   
   剩余 N-X 个文件，约 剩余批次 批。是否继续编译全部剩余文件？
   [1] 是，继续编译全部剩余文件
   [2] 否，暂停，我稍后继续（可随时通过 wiki compile 续编）
   
   请选择 (1/2):
   ```

10. **根据用户选择**（关键：必须保存用户选择）：
    - **用户选 1**：
      - 更新 `.kb-state.json`：`strategy.userChoice = 1`
      - 继续编译剩余所有文件，每批完成后：
        - `strategy.currentBatch++`
        - 更新 `compiledFiles` 和 `pendingFiles`
        - 更新 `stats` 统计
        - 写入 `.kb-state.json`
    
    - **用户选 2**：
      - 更新 `.kb-state.json`：
        - `status = "interrupted"`
        - `strategy.userChoice = 2`
        - 保存当前 `currentBatch`
        - 保存 `pendingFiles` 列表
      - 显示当前状态，等待下次续编

11. **全部完成后**：
    - 生成 `wiki/index.md`
    - 设置 `compileState.status = "completed"`，清空 `compiledFiles`
    - Git 提交最终结果

**反馈格式**：
```
🔄 编译知识库...
📍 扫描 raw/ 目录... ✅ 发现 N 个文件
📄 [1/N] <filename>
  🏷️ 文档类型: <type>
  [1/4] 🔍 提取关键要素... ✅ X 概念, Y 人物
  [2/4] 📝 生成摘要... ✅ N 字
  [3/4] 📚 撰写条目... ✅ 概念A, 概念B, 人物C
📊 进度: ████░░░░░░░░░░░░ 14% (1/7 文件)
...
✅ 编译完成！📋 处理 X 文件, Y 概念, Z 主题
✓ 已自动提交Git
```

## wiki status 执行步骤

当用户请求 `wiki status` 或询问编译进度时：

1. **读取编译状态**（Read）：`.kb-state.json`
2. **检查是否有中断的编译**：
   - 如果 `compileState.status === "interrupted"`，**必须提示用户**：
     ```
     ⚠️ 检测到上次编译中断，还有 X 个文件未处理
     
     已编译: Y 个文件
     待编译: X 个文件
     
     是否继续编译剩余文件？
     [1] 是，继续编译
     [2] 否，只查看状态
     
     请选择 (1/2):
     ```
3. **显示统计信息**：
   - 文件总数、已编译数、待编译数
   - 概念总数、人物总数、主题总数
   - 最后编译时间

**反馈格式**：
```
📊 知识库统计
━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 文件总数: N
✅ 已编译: X
⏳ 待编译: Y

🔄 编译策略（如果中断）：
  • 批次大小: M 个文件/批
  • 用户选择: [继续全部/暂停]
  • 当前批次: A / 总批次 B
  • 待编译文件列表:
    - file1.md
    - file2.epub

📚 知识条目:
  • 概念: A 个
  • 人物: B 个
  • 主题: C 个
  • 摘要: D 个

🕐 最后编译: 2026-04-18 10:30
```

## wiki qa 执行步骤

当用户请求 `wiki qa "问题"` 时：

1. **扫描 wiki/ 目录**（Bash）：`ls <kbPath>/wiki/concepts/`
2. **匹配并读取文件**（Read）：根据问题关键词读取相关 .md 文件
3. **基于内容回答**：严格基于 wiki/ 内容，列出参考来源

**反馈格式**：
```
📚 正在从知识库中检索...
📍 匹配概念... ✅ transformer, rnn
📍 匹配文章... ✅ 4 篇
💡 基于知识库的回答: <answer>
📖 参考来源: wiki/concepts/transformer.md, ...
```

## wiki lint 执行步骤

当用户请求 `wiki lint` 时：

1. **扫描所有 wiki/ 文件**（Bash）：`find <kbPath>/wiki/ -name "*.md"`
2. **检查断裂链接**：读取每个文件的 `[[wikilink]]`，检查文件是否存在
3. **检查覆盖度**：统计字数，<100 字标记为不足
4. **生成报告**：输出检查结果

**反馈格式**：
```
 质量检查...
 扫描 wiki/ 目录... ✅ 45 个文件
📍 检查断裂链接... ✅ 156 个链接, ⚠️ 3 个断裂
📍 检查覆盖度... ⚠️ 2 个文件不足
✅ 检查完成！📋 断裂链接: 3, 覆盖度不足: 2
```

## 编译质量要求

**角色**：资深学者和领域专家

**概念文件**必须包含：
- 定义 + 形成原因 + 至少2个具体事例 + 关联网络（人物/主题）

**人物文件**必须包含：
- 生卒年代 + 身份 + 性格特征 + 主要成就 + 至少2件具体事迹 + 关联网络

**所有文件**必须：
- 使用 emoji 图标（💡📋🔗📝等）
- 清晰层级结构（## ### ####）
- 使用 `[[wikilink]]` 交叉引用
- **禁止返回占位符 `[LLM response content]`**

## 目录结构

```
knowledge-base/
├── raw/              # 用户收集的原始材料
├── wiki/             # AI编译后的知识库
│   ├── index.md      # 全局索引
│   ├── summaries/    # 文章摘要
│   ├── concepts/     # 概念定义
│   ├── people/       # 人物条目
│   ├── topics/       # 主题聚合页
│   ├── methods/      # 学术：方法论
│   ├── findings/     # 学术：研究发现
│   ├── events/       # 新闻：事件
│   └── techniques/   # 技术：技术方案
├── .kb-state.json    # 编译状态
├── .kb-config.json   # 全局配置
└── .git/             # Git版本控制
```

## 文档类型

| 类型 | 识别方式 | 专有条目 |
|------|---------|---------|
| **narrative** | 默认 | people/ |
| **academic** | 路径含 papers/research/论文 | methods/, findings/ |
| **news** | 路径含 news/资讯/报道 | events/ |
| **technical** | 路径含 tutorial/docs/教程 | techniques/ |

## 文件格式支持

.md, .txt, .pdf, .docx, .pptx, .xlsx, .html, .epub, .csv, .json, .xml

**自动转换**：编译时自动检测非 Markdown 文件并转换，保存到 `raw/` 目录。

## 辅助工具

以下 Node.js 工具可供参考（不用于 LLM 调用）：

```bash
# Git操作
git log, git diff, git stash, git branch, git rollback

# 远程同步
remote setup, remote sync

# 多知识库
kb list, kb add, kb switch, kb remove
```

## 风险控制

| 风险 | 应对 |
|------|------|
| AI幻觉 | 定期人工审核，溯源到原文 |
| 错误累积 | Git版本控制，支持回滚 |
| 规模瓶颈 | 超1000篇建议改用RAG方案 |
