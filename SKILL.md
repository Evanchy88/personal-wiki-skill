---
name: personal-wiki
description: 基于Karpathy理念的个人知识库编译器。收集文章后，AI自动研读并整理成结构化的知识体系。
---

# personal-wiki

基于Karpathy理念的个人知识库编译器。你只管收集文章，AI负责整理成知识体系。

## 核心理念

- **用户收集**：将感兴趣的文章保存到 `raw/` 目录
- **LLM编译**：AI以资深学者身份深入研读，生成结构化的 `wiki/` 目录
- **纯Markdown**：不依赖任何特定软件，Obsidian/VS Code/任意编辑器均可查看
- **本地优先**：所有数据在本地，Git版本控制

## 命令列表

### 基础命令

| 命令 | 功能 |
|------|------|
| `wiki init [path]` | 初始化知识库 |
| `wiki compile` | 增量编译知识库 |
| `wiki clean [file]` | 清洗脏数据 |
| `wiki lint` | 质量检查与自动修复 |
| `wiki qa "问题"` | 基于wiki的问答 |
| `wiki status` | 状态查看 |
| `wiki view` | 查看知识库 |

### 多知识库管理

| 命令 | 功能 |
|------|------|
| `wiki kb list` | 列出所有已注册的知识库 |
| `wiki kb add <name> <path>` | 注册一个新知识库 |
| `wiki kb switch <name>` | 切换默认知识库 |
| `wiki kb remove <name>` | 移除知识库注册（不删除文件） |

### Git命令

| 命令 | 功能 |
|------|------|
| `wiki history` | 查看编译历史 |
| `wiki diff [commit]` | 查看编译变更 |
| `wiki rollback [commit]` | 回滚知识库 |
| `wiki git status` | 查看Git状态 |
| `wiki git log` | 查看完整Git历史 |
| `wiki git stash` | 暂存当前变更 |
| `wiki git branch` | 查看/切换分支 |

### 远程命令

| 命令 | 功能 |
|------|------|
| `wiki remote setup` | 配置远程仓库 |
| `wiki remote sync` | 同步远程变更 |

### 多知识库使用方式

所有操作命令支持 `--kb <name>` 参数指定目标知识库：

```bash
# 切换到 AI 知识库进行编译
wiki compile --kb ai-notes

# 从代码知识库中问答
wiki qa "React hooks最佳实践是什么？" --kb code-notes

# 查看特定知识库状态
wiki status --kb research

# 注册多个知识库
wiki kb add ai-notes D:\knowledge-base\ai
wiki kb add code-notes D:\knowledge-base\code
wiki kb add research D:\knowledge-base\research
```

## 交互流程

### wiki init

首次使用无参数时，询问保存路径：

```
wiki init

→ 📚 personal-wiki 知识库编译器
  这个Skill可以帮你：
  1. 📥 收集原始文章到 raw/ 目录
  2. 🤖 用LLM自动研读并生成结构化笔记到 wiki/ 目录
  3. 💬 基于笔记进行深度问答学习

  首先，知识库保存在哪个目录？
  [1] D:\knowledge-base (推荐)
  [2] 自定义路径

  请选择 (1/2) 或直接输入路径:
```

### wiki compile

编译前显示待处理文件清单和预计时间，征得用户同意后开始：

```
wiki compile

→ 📊 准备编译知识库...
  扫描 raw/ 目录...
  ✓ 发现 8 个文件
    • 新增: 5 个  • 修改: 2 个  • 未变: 1 个

  📋 待处理文件:
    1. article-attention.md (新增, 45KB)
    2. paper-transformer.md (新增, 120KB)
    ...

  ⏱️ 预计时间: 3-5 分钟
  开始编译? [Y/n]
```

编译中显示进度：

```
🔄 正在编译知识库...

[1/8] 研读 article-attention.md ...
      ✓ 提取概念: 4 个  ✓ 提取人物: 2 个
      ✓ 生成摘要: 280 字  ✓ 建立链接: 6 条

[进度条] ████████░░░░░░░░ 37% (3/8)
```

### wiki qa

**必须以 `wiki qa` 开头**，否则走LLM通用流程。

```
wiki qa "Transformer和RNN的区别是什么？"

→ 📚 正在从知识库中检索...
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
❌ 知识库中暂无关于"BERT的预训练任务"的内容。
💡 建议: 将相关文章保存到 raw/ 目录，然后运行 wiki compile
```

## 编译质量要求

### 角色定义

编译时，LLM必须作为**资深学者和领域专家**深入研读：

1. **全面覆盖，不遗漏**：通读全文，识别所有重要概念、观点、论据、数据、案例、人物
2. **忠于原文，不曲解**：摘要必须准确反映原文观点，保留论证逻辑和限定条件
3. **专家视角，有深度**：解释"为什么"和"怎么用"，建立有意义的交叉引用

### 输出格式

每个文件生成：
- `wiki/summaries/{filename}.md` - 200-300字摘要 + 核心观点 + 关键概念 + 重要人物 + 核心数据 + 案例 + 交叉引用
- `wiki/concepts/{concept}.md` - 概念定义 + 核心要点 + 来源文献 + 相关概念
- `wiki/people/{person}.md` - 人物条目（如有）
- `wiki/index.md` - 全局索引（自动更新）

### 禁止行为

- ❌ 不要用自己的话"重写"原文，而是"提炼"
- ❌ 不要省略数据、案例、人物
- ❌ 不要过度概括，丢失原文的精确表述
- ❌ 不要混入与原文无关的内容
- ❌ 不要将不同概念混为一谈

## 目录结构

```
knowledge-base/
├── raw/                  # 用户收集的原始材料
│   ├── *.md              # 文章、笔记
│   └── images/           # 关联图片
├── wiki/                 # LLM编译后的知识库
│   ├── index.md          # 全局索引
│   ├── summaries/        # 文章摘要
│   ├── concepts/         # 概念定义
│   ├── people/           # 人物条目
│   └── topics/           # 主题聚合页
├── .kb-state.json        # 编译状态记录
├── .kb-config.json       # 全局配置
└── .git/                 # Git版本控制
```

## Linting自动补全

运行 `wiki lint` 时自动检查：
- **断裂链接**：`[[概念]]` 引用的文件不存在 → 自动创建空概念文件
- **孤立概念**：概念文件没有被任何文章引用 → 标记 ⚠️
- **冲突标记**：不同文献对同一概念描述矛盾 → 保持 ⚠️ 标记，需人工判断
- **覆盖度不足**：概念文件过于简略（<100字）→ 自动调用LLM扩展
- **时效性检查**：文档超过6个月未更新 → 标注 📅 待更新

## Git版本控制

- 初始化时自动 `git init`
- 编译后自动提交变更
- 支持 `wiki rollback` 回滚到任意历史版本
- 可选配置远程仓库同步

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
- 转换后的 Markdown 文件保存在临时目录，编译完成后自动清理
- 源文件保留不变，不会被修改
- 推荐安装 `markitdown` 获得最佳转换效果：`npm install -g markitdown`

## 文件限制

- 单文件大小 ≤ 200KB
- 单次编译文件数 ≤ 20个
- 总知识库规模 ≤ 500篇（推荐）

## 风险控制

| 风险 | 应对 |
|------|------|
| LLM幻觉 | 定期人工审核，溯源到原文 |
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
