---
name: personal-wiki
description: 基于Karpathy理念的个人知识库编译器。AI直接研读文章并整理成结构化的知识体系，无需调用外部LLM API。
---

# personal-wiki

基于Karpathy理念的个人知识库编译器。**你（AI）直接作为编译引擎**，研读用户收集的文章，整理成结构化的知识体系。

## 核心架构

**你不再执行 `node index.js compile`**，而是：
1. 读取 `prompts/` 目录下的编译模板，理解规则
2. 扫描 `raw/` 目录，获取待处理文章
3. **你亲自研读每篇文章**，提取概念、人物、主题
4. **你亲自生成摘要和概念条目**，按照 prompt 模板的格式
5. **你亲自写入 `wiki/` 目录**，建立交叉引用

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

**Skill 位置**：
- SKILL.md：`d:\Qoder\personal-wiki-skill\SKILL.md`
- Prompt 模板：`d:\Qoder\personal-wiki-skill\prompts\`
- **使用绝对路径读取 prompt 文件**

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
   - **1-3 个文件**：直接全部编译
   - **4+ 个文件**：先编译第一批（1-3个），然后询问用户

6. **编译第一批文件**（Read + Write）：
   - 读取文件内容
   - 提取概念、人物、主题（生成 JSON）
   - 生成摘要 → `wiki/summaries/`
   - 生成概念条目 → `wiki/concepts/`
   - 生成人物条目 → `wiki/people/`
7. **更新编译状态**（Write）：
   - 将已编译文件添加到 `compileState.compiledFiles`
   - 设置 `compileState.status = "interrupted"`（如果未完成）或 `"completed"`（如果全部完成）
   - 更新 `.kb-state.json`
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

10. **根据用户选择**：
    - 用户选 1 → 继续编译剩余所有文件，每批完成后显示进度
    - 用户选 2 → 设置 `compileState.status = "interrupted"`，保存状态，显示当前状态

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

📚 知识条目:
  • 概念: A 个
  • 人物: B 个
  • 主题: C 个

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
