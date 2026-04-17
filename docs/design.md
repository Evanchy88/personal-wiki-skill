# personal-wiki Skill 设计方案

## 一、项目概述

### 1.1 核心理念

基于Andrej Karpathy提出的个人知识库构建方法，让LLM充当知识管理员：
- **用户只管收集文章**，放入 `raw/` 目录
- **LLM负责研读、整理、交叉链接**，生成结构化的 `wiki/` 目录
- **纯Markdown格式**，不依赖任何特定软件
- **本地优先**，Git版本控制

### 1.2 三阶段架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Data Ingest │ ──▶ │ LLM Compile │ ──▶ │   Q&A /     │
│   raw/      │     │    wiki/    │     │   Output    │
└─────────────┘     └─────────────┘     └─────────────┘
 收集原始材料         专家级研读编译        基于wiki问答
```

### 1.3 与Obsidian的关系

本Skill生成的知识库是**纯Markdown格式，不依赖Obsidian**。用户可用任何Markdown查看器打开：
- **Obsidian**（推荐）：双向链接 + 图谱可视化
- **VS Code**：开发者友好
- **任意编辑器**：纯文本查看
- **浏览器**：HTML预览

---

## 二、目录结构

```
knowledge-base/
├── raw/                  # 用户收集的原始材料
│   ├── *.md              # 文章、笔记（Markdown格式）
│   ├── images/           # 文章关联的图片
│   └── ...               # 其他待转换文件（.html, .pdf等）
├── wiki/                 # LLM自动编译的知识库
│   ├── index.md          # 全局索引
│   ├── summaries/        # 文章摘要（每篇200-300字）
│   ├── concepts/         # 概念定义与解释
│   ├── people/           # 人物条目（如有）
│   └── topics/           # 主题聚合页
├── images/               # 知识库通用图片
├── .wiki-state.json        # 编译状态记录（hash、mtime）
├── .wiki-config.json       # 全局配置（路径、模型等）
├── .gitignore
└── .git/                 # Git版本控制
```

---

## 三、命令设计

### 3.1 命令列表

| 命令 | 功能 | 说明 |
|------|------|------|
| `wiki init [path]` | 初始化知识库 | 交互式确认路径、创建目录、git init |
| `wiki compile` | 增量编译知识库 | 变更检测→清洗→转换→专家研读→生成wiki |
| `wiki clean [file]` | 清洗脏数据 | 去除广告、导航、评论等 |
| `wiki lint` | 质量检查与自动修复 | 断裂链接、孤立概念、覆盖度、自动补全 |
| `wiki qa "问题"` | 基于wiki的问答 | 检索相关wiki→综合推理→输出答案+引用 |
| `wiki status` | 状态查看 | raw/wiki统计、最后编译时间、待处理变更 |
| `wiki view` | 查看知识库 | 选择Obsidian/VS Code/文件管理器/浏览器 |
| `wiki history` | 查看编译历史 | git log格式化 |
| `wiki diff [commit]` | 查看编译变更 | git diff某次提交 |
| `wiki rollback [commit]` | 回滚知识库 | git reset --hard |
| `wiki git status` | 查看Git状态 | git status，显示未提交变更 |
| `wiki git log` | 查看完整Git历史 | git log --oneline |
| `wiki git stash` | 暂存当前变更 | git stash，保存工作区修改 |
| `wiki git branch` | 查看/切换分支 | git branch，本地知识版本管理 |
| `wiki remote setup` | 配置远程仓库 | 交互式引导配置GitHub/其他Git服务 |
| `wiki remote sync` | 同步远程 | git push + git pull |

---

## 四、详细交互流程

### 4.1 wiki init — 初始化

#### 首次使用（无参数）

```
用户: wiki init

Qoder: 📚 Karpathy知识库编译器
       这个Skill可以帮你：
       1. 📥 收集原始文章到 raw/ 目录
       2. 🤖 用LLM自动研读并生成结构化笔记到 wiki/ 目录
       3. 💬 基于笔记进行深度问答学习
       
       首先，知识库保存在哪个目录？
       [1] D:\knowledge-base (推荐)
       [2] 自定义路径
       
       请选择 (1/2) 或直接输入路径:
```

#### 用户选择默认路径

```
用户: 1

Qoder: ✓ 将保存到: D:\knowledge-base
       
       正在初始化知识库...
       • 创建 raw/ 目录        ✓
       • 创建 wiki/ 目录       ✓
       • 创建 images/ 目录     ✓
       • 初始化 Git 仓库       ✓
       • 生成 .gitignore       ✓
       
       📁 目录结构:
       D:\knowledge-base\
       ├── raw/          ← 你把想学习的文章放这里
       ├── wiki/         ← AI自动生成的学习笔记
       ├── images/       ← 文章中的图片
       └── .wiki-state.json ← 编译状态记录
       
       💡 下一步:
       1. 把感兴趣的文章保存到 raw/ 目录
       2. 运行 wiki compile 开始编译
       3. 运行 wiki view 用Obsidian或其他工具查看
       
       需要我帮你保存一些文章到 raw/ 吗？
       [y] 是的，帮我保存
       [n] 不用，我自己来
```

#### 用户指定路径

```
用户: wiki init D:\my-study\ai-notes

Qoder: ✓ 将保存到: D:\my-study\ai-notes
       目录不存在，将自动创建。
       (执行同上初始化流程)
```

#### 配置文件写入

初始化完成后自动写入 `~/.wiki-config.json`：

```json
{
  "defaultPath": "D:\\knowledge-base",
  "githubUser": "Evanchy88",
  "llmModel": "qwen-plus"
}
```

---

### 4.2 wiki compile — 编译知识库

#### 编译前确认

```
用户: wiki compile

Qoder: 📊 准备编译知识库...
       
       扫描 raw/ 目录...
       ✓ 发现 8 个文件
         • 新增: 5 个
         • 修改: 2 个
         • 未变: 1 个
         • 删除: 0 个
       
       📋 待处理文件:
         1. article-attention-is-all-you-need.md (新增, 45KB)
         2. paper-transformer.md (新增, 120KB)
         3. blog-rnn-vs-lstm.md (新增, 32KB)
         4. tutorial-pytorch.md (新增, 28KB)
         5. notes-backprop.md (新增, 15KB)
         6. article-gpt2.md (修改, 67KB)
         7. article-bert.md (修改, 54KB)
       
       ⏱️ 预计时间: 3-5 分钟 (8个文件, 使用 qwen-plus 模型)
       📝 编译模式: 专家级研读 (全覆盖、不遗漏)
       
       开始编译? [Y/n]
```

#### 编译中（进度提示）

```
用户: y

Qoder: 🔄 正在编译知识库...
       
       [1/8] 研读 article-attention-is-all-you-need.md ...
             ✓ 提取概念: 4 个 (Attention, Multi-Head, Scaled Dot-Product, ...)
             ✓ 提取人物: 2 个 (Vaswani, Bahdanau)
             ✓ 生成摘要: 280 字
             ✓ 建立链接: 6 条
       
       [2/8] 研读 paper-transformer.md ...
             ✓ 提取概念: 5 个
             ✓ 提取人物: 1 个
             ✓ 生成摘要: 310 字
             ✓ 建立链接: 8 条
       
       [3/8] 研读 blog-rnn-vs-lstm.md ...
             🧹 检测到脏数据，正在清洗...
             ✓ 删除广告: 2 处
             ✓ 删除导航: 1 处
             ✓ 提取概念: 3 个
             ...
       
       [进度条] ████████░░░░░░░░ 37% (3/8)
       ⏱️ 已用时: 1 分钟
```

#### 编译完成

```
Qoder: ✓ 编译完成!
       
       📋 编译报告
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       
       📥 输入统计
         • 处理文件: 7 个
         • 跳过文件: 1 个 (未变更)
         • 清洗脏数据: 2 个
         • Token消耗: ~150K input
       
       📤 输出统计
         • 生成摘要: 7 篇
         • 提取概念: 18 个
         • 提取人物: 5 个
         • 建立链接: 42 条
       
       ⚠️ 问题发现
         • 冲突标记: 1 处
           → "注意力机制"定义在 article-attention.md 和 
             paper-transformer.md 中表述不完全一致
         • 断裂链接: 0 条
         • 解析失败: 0 个
       
       💡 建议
         • 请抽检 wiki/summaries/ 确认内容准确性
         • 运行 wiki lint 进行深度质量检查
         • 运行 wiki view 用Obsidian或其他工具查看完整知识库
       
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       ✓ 已自动提交Git (commit: abc1234)
```

---

### 4.3 wiki lint — 质量检查

```
用户: wiki lint

Qoder: 🔍 正在检查知识库质量...
       
       [1/6] 检查断裂链接 ...
             ✓ 扫描 42 条链接，发现 2 条断裂
       
       [2/6] 检查孤立概念 ...
             ✓ 发现 1 个孤立概念 (未被任何文章引用)
       
       [3/6] 检查冲突标记 ...
             ✓ 发现 1 处概念冲突
       
       [4/6] 检查概念缺失 ...
             ✓ 发现 2 个缺失概念，正在自动创建...
             • 创建 concepts/embedding.md ✓
             • 创建 concepts/token.md ✓
       
       [5/6] 检查覆盖度 ...
             ✓ 发现 1 篇概念描述过简 (<100字)，正在扩展...
             • 扩展 concepts/attention.md (80字 → 320字) ✓
       
       [6/6] 检查时效性 ...
             ✓ 发现 0 篇过期文档
       
       📋 Lint 报告
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       
       ✅ 已自动修复
         • 断裂链接: 2 条 (已创建空概念文件)
         • 覆盖度不足: 1 篇 (已自动扩展)
       
       ⚠️ 需要人工处理
         • 概念冲突: 1 处
           → wiki/concepts/attention.md 包含冲突标记
           → 请人工审阅确认哪个定义更准确
         • 孤立概念: 1 个
           → wiki/concepts/orphan-concept.md
           → 考虑删除或找到相关文章引用它
       
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 4.4 wiki qa — 基于Wiki的问答

#### 触发方式

**必须使用 `wiki qa "问题"` 格式**，否则走LLM通用流程。

| 用户输入 | 触发方式 | 回答来源 |
|----------|----------|----------|
| `wiki qa "Transformer是什么？"` | **Skill Q&A** | 仅基于 wiki/ 目录 |
| `帮我解释Transformer` | LLM通用回答 | LLM训练知识 |
| `wiki compile` | **Skill编译** | 执行编译操作 |

#### 有内容的回答

```
用户: wiki qa "注意力机制的主要类型有哪些？"

Qoder: 📚 正在从知识库中检索...
       • 知识库路径: D:\knowledge-base
       • 匹配概念: attention, multi-head, self-attention
       • 相关文章: 5 篇
       
       💡 基于知识库的回答:
       
       根据知识库内容，注意力机制主要有以下类型：
       
       **1. 自注意力 (Self-Attention)**
       序列内部每个位置对所有其他位置计算注意力权重...
       [[concepts/attention.md]] [[summaries/attention-is-all-you-need.md]]
       
       **2. 多头注意力 (Multi-Head Attention)**
       将注意力分成多个"头"，每个头学习不同的表示...
       [[concepts/attention.md]] [[concepts/multi-head.md]]
       
       **3. 交叉注意力 (Cross-Attention)**
       用于encoder-decoder架构，查询来自一个序列，键值来自另一个...
       [[summaries/transformer-architecture.md]]
       
       📖 参考来源:
       • wiki/concepts/attention.md
       • wiki/concepts/multi-head.md
       • wiki/summaries/attention-is-all-you-need.md
       • wiki/summaries/transformer-architecture.md
```

#### 无内容的回答

```
用户: wiki qa "BERT的预训练任务是什么？"

Qoder: 📚 正在从知识库中检索...
       • 知识库路径: D:\knowledge-base
       • 检索完成
       
       ❌ 知识库中暂无关于"BERT的预训练任务"的内容。
       
       💡 建议:
       • 将BERT相关论文或文章保存到 raw/ 目录
       • 运行 wiki compile 编译知识库
       • 或运行 wiki qa "注意力机制" 查询知识库中已有的内容
```

---

### 4.5 wiki view — 查看知识库

```
用户: wiki view

Qoder: 📂 知识库路径: D:\knowledge-base
       
       检测到已安装的查看工具:
       ✓ Obsidian
       ✓ VS Code
       
       请选择打开方式:
       [1] Obsidian (推荐，支持双向链接和图谱视图)
       [2] VS Code (开发者友好)
       [3] 文件管理器 (仅浏览文件)
       [4] 浏览器预览 (生成HTML页面)
       
       请选择 (1-4):
```

**如果都没安装：**

```
Qoder: 📂 知识库路径: D:\knowledge-base
       
       未检测到Obsidian或VS Code。
       
       请选择打开方式:
       [1] 文件管理器 (浏览原始Markdown文件)
       [2] 浏览器预览 (生成HTML页面)
       
       💡 推荐安装 Obsidian 以获得最佳体验:
          https://obsidian.md
       
       请选择 (1-2):
```

---

### 4.6 wiki status — 状态查看

```
用户: wiki status

Qoder: 📊 知识库状态
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       
       📁 路径: D:\knowledge-base
       
       📥 raw/ 目录
         • 文件数: 25 个
         • 总大小: 1.2MB
         • 最新文件: article-gpt4.md (2小时前)
       
       📤 wiki/ 目录
         • 摘要: 23 篇
         • 概念: 45 个
         • 人物: 12 个
         • 主题: 8 个
         • 总链接: 156 条
       
       🔄 编译状态
         • 最后编译: 2026-04-17 14:30
         • 待处理变更: 2 个新文件
         • Git状态: 干净 (无未提交变更)
       
       💡 提示
         • 运行 wiki compile 编译新文件
         • 运行 wiki lint 检查知识库质量
       
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 五、核心机制

### 5.1 增量编译机制

通过 `.wiki-state.json` 维护文件状态，实现增量编译：

```json
{
  "version": 1,
  "lastCompile": "2026-04-17T10:30:00Z",
  "files": {
    "raw/article-a.md": {
      "mtime": 1713340200000,
      "size": 15234,
      "hash": "abc123...",
      "compiled": true,
      "wikiRefs": ["wiki/summaries/article-a.md", "wiki/concepts/transformer.md"]
    }
  }
}
```

**变更检测逻辑：**

| 场景 | 检测方式 | 触发动作 |
|------|----------|----------|
| 新增文件 | raw/中存在但未记录在.wiki-state.json中 | 编译该文件，生成wiki条目 |
| 文件修改 | mtime或hash与记录不一致 | 重新编译，更新对应wiki条目 |
| 文件删除 | .wiki-state.json中记录但raw/中不存在 | 删除对应wiki条目，清理孤立概念 |
| 文件未变 | mtime和hash均一致 | 跳过，不做任何处理 |

### 5.2 脏数据清洗

在文件进入 `raw/` 后、编译之前，自动清洗：

**清洗规则：**

| 必须删除 | 必须保留 |
|----------|----------|
| 广告内容（横幅、弹窗、推广链接） | 文章正文（标题、段落、列表、代码块） |
| 导航栏（顶部、侧边栏、面包屑、页脚） | 作者信息、发布日期、更新时间 |
| 评论区、社交分享按钮 | 图片及其alt文本 |
| Cookie提示、GDPR声明 | 引用和参考文献 |
| 重复内容（侧边栏"相关文章"） | 标签和分类 |

### 5.3 文件格式支持

| 格式 | 支持方式 | 说明 |
|------|----------|------|
| `.md` | ✅ 直接读取 | Markdown文件 |
| `.txt` | ✅ 直接读取 | 纯文本文件 |
| `.html` | ✅ 需转换+清洗 | 通过markdown-converter转换，自动清洗广告 |
| `.pdf` | ✅ 需转换 | 通过markdown-converter转换 |
| `.docx` | ✅ 需转换 | 通过markdown-converter转换 |
| 图片 | ❌ 不解析内容 | 仅作为附件存放 |
| 视频/音频 | ❌ 不支持 | 仅作为附件存放 |

### 5.4 文件限制

| 限制项 | 限制值 | 处理方式 |
|--------|--------|----------|
| 单文件大小 | ≤ 200KB (约5万字) | 超出则拆分为多批处理 |
| 单次编译文件数 | ≤ 20个 | 超出则提示分批编译 |
| raw/总文件数 | ≤ 1000个 | 超出则警告性能下降 |
| 总知识库规模 | ≤ 500篇（推荐） | 超出则建议分层或混合方案 |

### 5.5 预计编译时间

| 场景 | 文件数 | 预计时间 |
|------|--------|----------|
| 首次编译（少量） | 5-10篇 | 1-3分钟 |
| 首次编译（中量） | 20-50篇 | 5-15分钟 |
| 首次编译（大量） | 50-100篇 | 15-30分钟 |
| 增量更新 | 1-5篇 | 30秒-2分钟 |
| 全量重编译 | 100+篇 | 30分钟+（不推荐） |

---

## 六、专家级编译Prompt

### 6.1 角色定义

```
你是一位资深学者和领域专家，正在为用户编译个人知识库。你的任务是
深入研读原始文献，提取所有关键知识，确保用户通过学习wiki能够
全面掌握原文内容。
```

### 6.2 核心原则

#### 全面覆盖，不遗漏
- 通读全文，识别所有重要概念、观点、论据、数据、案例
- 为每个重要知识点创建独立的wiki条目
- 不要因为是"常识"就跳过，用户的知识背景可能不同
- 不要因为是"细节"就省略，细节往往是理解的关键

#### 忠于原文，不曲解
- 摘要必须准确反映原文观点，不得篡改或过度简化
- 保留原文的论证逻辑和推理过程
- 保留原文的限定条件和适用范围
- 如果原文观点有争议，必须标注争议点

#### 专家视角，有深度
- 不仅要总结"是什么"，还要解释"为什么"和"怎么用"
- 识别概念之间的内在联系，建立有意义的交叉引用
- 补充必要的背景知识（用"背景"标记区分于原文内容）
- 指出该知识点在学科体系中的位置

### 6.3 输出格式

#### 摘要文件 (wiki/summaries/{filename}.md)

```markdown
# {文章标题}

> 来源: {原文件路径}
> 作者: {原文作者，如有}
> 日期: {编译日期}

## 核心观点
- [观点1]: {准确概括，2-3句}
- [观点2]: ...
（列举所有重要观点，不遗漏）

## 关键概念
- [[概念1]]: {定义与解释}
- [[概念2]]: ...
（提取所有重要概念，建立双向链接）

## 重要人物
- [[人物1]]: {角色与贡献}
- [[人物2]]: ...
（如有提及，必须列出）

## 核心论据与数据
- {关键数据点1}: {数值/实验结果/统计}
- {关键数据点2}: ...
（保留重要数据，不模糊化）

## 案例与应用
- {案例1}: {简述与启示}
- ...
（如有案例，必须记录）

## 与其他知识的关联
- 与 [[相关概念1]] 的关系: ...
- 与 [[相关概念2]] 的区别: ...
（建立交叉引用）

## 争议与局限
- {争议点1}: {不同观点或质疑}
- {局限性}: {适用范围或边界条件}
（如有，必须标注）
```

#### 概念文件 (wiki/concepts/{concept}.md)

```markdown
# {概念名称}

## 定义
{准确定义，基于原文但不局限于单一表述}

## 核心要点
1. {要点1}
2. {要点2}
3. ...

## 来源文献
- [[摘要文件名]]: {该文献中的相关描述}

## 相关概念
- [[相关概念1]]: {关系说明}
- [[相关概念2]]: ...

## 扩展阅读
- {背景知识或补充说明，标注"扩展"与原文区分}
```

### 6.4 禁止行为

- ❌ 不要用自己的话"重写"原文，而是"提炼"
- ❌ 不要省略数据、案例、人物
- ❌ 不要过度概括，丢失原文的精确表述
- ❌ 不要混入与原文无关的内容
- ❌ 不要忽略原文的限定条件和假设
- ❌ 不要将不同概念混为一谈

### 6.5 自检清单

在生成每个wiki条目后，问自己：
1. 用户只看这篇wiki，能否理解原文的核心内容？
2. 是否有遗漏的重要概念、数据、人物、案例？
3. 交叉引用是否准确、完整？
4. 是否有断章取义或过度简化？
5. 如果原文有复杂论证，是否完整保留了推理链条？

如果任一问题答案为"否"，必须重新研读并补充。

---

## 七、Linting自动补全

### 7.1 检查项与自动修复

| 检查项 | 检测内容 | 自动修复策略 |
|--------|----------|--------------|
| 断裂链接 | `[[概念]]` 引用的文件不存在 | 自动创建空概念文件，标注"待补充" |
| 孤立概念 | 概念文件没有被任何文章引用 | 标记为 `⚠️ 孤立`，提示用户确认是否删除 |
| 冲突标记 | 不同文献对同一概念描述矛盾 | 保持 `⚠️ 冲突` 标记，**不自动修复**，需人工判断 |
| 概念缺失 | 摘要中提到的概念没有对应概念文件 | 自动调用LLM生成概念定义 |
| 覆盖度不足 | 概念文件过于简略（<100字） | 自动调用LLM扩展，补充背景和关联 |
| 时效性检查 | 文档超过6个月未更新 | 标注 `📅 待更新`，建议用户重新审阅 |

### 7.2 Lint报告示例

```
🔍 Lint 报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 通过
  • 总wiki文件: 45 篇
  • 总链接数: 128 条
  • 冲突标记: 0 处

⚠️ 问题（已自动修复）
  • 断裂链接: 3 条
    → 已创建 concepts/rag.md (待补充)
    → 已创建 concepts/embedding.md (待补充)
  • 覆盖度不足: 1 篇
    → concepts/attention.md 已扩展 (80字 → 320字)

❌ 需要人工处理
  • 时效性过期: 5 篇 (超过6个月未更新)
  • 孤立概念: 2 个 (未被任何文章引用)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 建议运行 wiki compile --refresh 重新编译过期文档
```

---

## 八、基于Wiki的Q&A机制

### 8.1 触发条件

**只有以 `wiki qa` 开头的对话才会触发知识库Q&A**，其他问题走LLM正常流程。

### 8.2 工作流程

```
用户: wiki qa "Transformer和RNN有什么区别？"
                    │
                    ▼
        ┌──────────────────────┐
        │ 1. 读取 index.md     │
        │    定位相关概念       │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 2. 收集相关wiki文章  │
        │    • concepts/       │
        │    • summaries/      │
        │    • topics/         │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 3. 构建上下文Prompt   │
        │    [相关wiki内容]    │
        │    + 用户问题         │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 4. LLM生成答案        │
        │    严格基于wiki       │
        │    不得编造           │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 5. 输出答案+引用来源  │
        │    [[文件名]] 标注    │
        └──────────────────────┘
```

### 8.3 Q&A Prompt模板

```markdown
你是一个基于个人知识库的研究助手。请**严格根据以下wiki内容**回答用户的问题。

## 知识库上下文

{从wiki/目录中检索的相关文章内容}

## 回答规则
1. 必须基于上述wiki内容回答
2. 如果wiki中没有相关信息，回答："知识库中暂无相关内容"
3. 不得编造或使用你的通用训练知识
4. 在答案中用 [[文件名]] 标注参考来源
5. 如果多个文件有冲突信息，指出冲突并说明来源

## 用户问题

{用户的问题}
```

### 8.4 检索策略

| 检索方式 | 说明 |
|----------|------|
| 索引检索 | 读取 `wiki/index.md`，快速定位相关概念 |
| 概念匹配 | 问题中提到的概念名，直接读取对应概念文件 |
| 反向链接 | 通过反向链接找到所有引用该概念的文章 |
| 全文搜索 | 复杂问题时搜索wiki/目录中的关键词 |

---

## 九、Git版本控制

### 9.1 自动化策略

| 时机 | 操作 |
|------|------|
| 初始化 | `git init` + `.gitignore` + 初始commit |
| 编译前 | 检查raw/是否有未提交的变更，如有则先提交 |
| 编译后 | 自动提交wiki/和.wiki-state.json的变更 |
| Lint后 | 提交自动修复的变更 |

### 9.2 提交信息格式

```
wiki: compile - {n} files processed, {m} wiki pages generated

- Added: {x}
- Modified: {y}
- Deleted: {z}
- Issues: {w} (conflict detected in {file})
```

### 9.3 远程仓库（可选）

| 命令 | 功能 |
|------|------|
| `wiki remote setup` | 配置远程仓库（交互式引导） |
| `wiki remote create` | 自动创建GitHub私有仓库（需gh CLI） |
| `wiki remote sync` | 推送/拉取远程变更 |
| `wiki remote status` | 查看远程同步状态 |

---

## 十、风险控制

### 10.1 风险与应对

| 风险 | 说明 | 应对策略 |
|------|------|----------|
| LLM幻觉 | 生成的摘要/链接可能不准确 | 定期人工审核，溯源到原文 |
| 错误累积 | 长期自动维护导致质量退化 | Git版本控制，支持回滚 |
| 规模瓶颈 | 超1000篇后管理复杂度激增 | 考虑混合方案（RAG + wiki） |
| 知识时效性 | 过时内容未被识别 | 定期Linting增加"时效性检查" |
| 认知外包 | 过度依赖LLM整理 | 保留部分手动笔记，定期人工通读 |
| 错误传播 | 一个错误定义污染多篇关联文章 | 反向链接 + 冲突标记 + 人工审核 |

### 10.2 不适用场景

| 场景 | 说明 |
|------|------|
| 知识库 > 1000篇文档 | 建议改用RAG方案 |
| 需要毫秒级检索 | 向量数据库更合适 |
| 高度动态数据 | 新闻/股票等实时数据 |
| 多模态为主 | 视频/音频内容 |

---

## 十一、技术实现要点

### 11.1 路径解析

```javascript
function resolveKbPath(userInput) {
  // 1. 优先使用用户传入的参数
  if (userInput) {
    return path.resolve(userInput);
  }
  
  // 2. 其次读取全局配置文件
  const configPath = path.join(os.homedir(), '.wiki-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.defaultPath) {
      return config.defaultPath;
    }
  }
  
  // 3. 最后使用硬编码默认值
  return process.platform === 'win32' 
    ? 'D:\\knowledge-base' 
    : path.join(os.homedir(), 'knowledge-base');
}
```

### 11.2 增量编译逻辑

```javascript
async function compile(wikiPath, options = {}) {
  const state = loadState(wikiPath);
  const rawFiles = scanDirectory(path.join(wikiPath, 'raw'));
  
  const changes = { added: [], modified: [], deleted: [], unchanged: [] };
  
  // 检测新增和修改
  for (const file of rawFiles) {
    const record = state.files[file];
    const stats = fs.statSync(file);
    const hash = computeHash(file);
    
    if (!record) {
      changes.added.push({ file, stats, hash });
    } else if (record.hash !== hash || record.mtime !== stats.mtimeMs) {
      changes.modified.push({ file, stats, hash, oldRecord: record });
    } else {
      changes.unchanged.push(file);
    }
  }
  
  // 检测删除
  for (const [file, record] of Object.entries(state.files)) {
    if (!rawFiles.includes(file)) {
      changes.deleted.push({ file, record });
    }
  }
  
  // 无变更则跳过
  const totalChanges = changes.added.length + changes.modified.length + changes.deleted.length;
  if (totalChanges === 0) {
    console.log('✓ No changes detected. Knowledge base is up to date.');
    return;
  }
  
  // 仅处理变更的文件
  const toCompile = [...changes.added, ...changes.modified];
  for (const batch of chunk(toCompile, options.batchSize || 10)) {
    await compileBatch(batch, wikiPath);
  }
  
  // 清理已删除文件的wiki条目
  for (const { file, record } of changes.deleted) {
    await cleanupWiki(record.wikiRefs, wikiPath);
  }
  
  // 更新状态并提交
  updateState(state, rawFiles, changes);
}
```

### 11.3 脏数据检测

```javascript
function needsCleaning(content) {
  const dirtySignals = [
    /nav\s*=/,                    // 导航栏
    /cookie\s*consent/i,          // Cookie提示
    /share\s*this|share\s*on/i,   // 分享按钮
    /<aside|<footer|<header/,     // 页面结构元素
    /广告|推广|赞助/i              // 中文广告
  ];
  
  return dirtySignals.some(re => re.test(content));
}
```

### 11.4 查看工具检测

```javascript
async function detectViewers() {
  const viewers = { obsidian: false, vscode: false };
  
  if (process.platform === 'win32') {
    try {
      await exec('where obsidian');
      viewers.obsidian = true;
    } catch {}
    
    try {
      await exec('where code');
      viewers.vscode = true;
    } catch {}
  }
  
  return viewers;
}
```

---

## 十二、完整编译流程图

```
┌─────────────────────────────────────────┐
│          wiki compile 启动                  │
└──────────────────┬──────────────────────┘
                   ▼
        ┌──────────────────────┐
        │ 1. 变更检测           │
        │    对比.wiki-state.json │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 2. 无变更？→ 退出     │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 3. 内容清洗（脏数据）  │
        │    去除广告/导航等     │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 4. 格式转换           │
        │    .html/.pdf → .md  │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 5. 分批编译           │
        │    专家级研读          │
        │    生成wiki            │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 6. 更新索引和链接     │
        │    index.md           │
        │    反向链接            │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 7. 生成编译报告       │
        └──────┬───────────────┘
               ▼
        ┌──────────────────────┐
        │ 8. Git提交            │
        └──────────────────────┘
```

---

## 十三、与现有Obsidian Skill的关系

| 维度 | obsidian Skill | personal-wiki Skill |
|------|----------------|--------------------------|
| 功能定位 | 笔记的读写操作（CRUD） | 知识库的自动编译与维护 |
| 使用场景 | 搜索/创建/编辑单条笔记 | 批量处理、自动化管线 |
| 底层工具 | 可作为personal-wiki的底层支持 | 上层自动化逻辑 |
| 依赖关系 | 独立 | 可配合使用，非强依赖 |

---

## 十四、总结

### 核心价值

| 价值点 | 说明 |
|--------|------|
| 从消费到编译 | 不只是收藏文章，而是提炼成知识体系 |
| Markdown为王 | 最简洁、最通用、最LLM友好 |
| 状态化知识 | 持久化，AI不再失忆 |
| 低门槛高天花板 | 3步即可启动，上限取决于使用深度 |
| 架构中立 | 不绑定任何软件，纯文本文件 |
| 可审计 | 人类可直接阅读.md文件 |

### 适用场景

- 个人/小团队知识管理
- 技术文档为主
- 追求可审计性
- 100-500篇文档规模
