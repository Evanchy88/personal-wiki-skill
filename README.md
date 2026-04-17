# Personal Wiki

Build and maintain a personal knowledge base wiki using LLM-powered compilation. Inspired by Andrej Karpathy's personal knowledge base method.

## Methodology

This skill implements **Karpathy's Personal Knowledge Base Method** — a systematic approach to building a living, evolving knowledge repository:

### Core Philosophy

> "Don't just collect information — transform it. Read raw material, extract key insights, connect ideas, and build a structured knowledge graph that grows with you."

The method addresses a common problem: we bookmark articles, save PDFs, and collect resources, but rarely revisit them. Personal Wiki solves this by using LLM as a **knowledge compiler** — it reads your raw collection, digests the content, and produces structured, interconnected wiki pages that are actually useful.

### The Three-Stage Pipeline

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Data       │     │  LLM             │     │  Q&A /          │
│  Ingest     │────▶│  Compile         │────▶│  Output         │
│  (raw/)     │     │  (wiki/)         │     │  (view/qa)      │
└─────────────┘     └──────────────────┘     └─────────────────┘
     Collect           Transform               Consume
```

1. **Data Ingest** — You collect articles, papers, notes, blog posts in `raw/`. No organization required — just dump everything in.
2. **LLM Compile** — The AI acts as a **senior scholar**: reads every file thoroughly, extracts ALL concepts/people/data/cases, builds structured wiki pages with `[[wikilinks]]` for cross-referencing.
3. **Q&A / Output** — Query your knowledge base, view in Obsidian (graph view, backlinks), or any Markdown viewer. The wiki is pure Markdown — no software dependency.

### Why This Approach Works

| Problem | Traditional | Personal Wiki |
|---------|------------|---------------|
| Bookmark hoarding | Save links, never revisit | LLM extracts value immediately |
| Information overload | Manual summarization | Automated, expert-level extraction |
| Knowledge silos | Scattered across tools | Unified, interconnected wiki |
| Stale content | Outdated, forgotten | Incremental updates, version controlled |
| Search friction | Full-text search only | Semantic Q&A + wiki navigation |

### Key Design Principles

- **Read everything, miss nothing** — LLM reads each file in full, extracts ALL key points
- **No concept left behind** — Every concept, person, data point, case study gets its own entry
- **Connect ideas** — Wiki links create a knowledge graph, not just a folder of files
- **Incremental** — Only process what changed, no redundant work
- **Pure Markdown** — No proprietary format, viewable anywhere
- **Git versioned** — Every change tracked, roll back anytime

## Overview

Personal Wiki transforms your collection of raw articles and documents into a structured, interconnected knowledge base. The workflow follows three stages:

1. **Data Ingest** - Collect raw articles (HTML, PDF, text, markdown) in the `raw/` folder
2. **LLM Compile** - AI reads and compiles them into structured wiki pages in the `wiki/` folder
3. **Q&A / Output** - Query your knowledge base or view it in Obsidian/any Markdown viewer

## Features

- **Incremental Compilation** - Only processes new/modified files, tracks state with `.kb-state.json`
- **Dirty Data Cleaning** - Removes ads, navigation, comments, and other noise from raw content
- **Expert-Level Knowledge Extraction** - Comprehensive coverage of concepts, people, data, and cases
- **Wiki Links** - Obsidian-compatible `[[wikilink]]` syntax for bidirectional linking
- **Auto-Fix Linting** - Detects broken links, expands coverage, auto-creates concept files
- **Wiki-Based Q&A** - Strict knowledge-only answers with source citations
- **Git Version Control** - Auto-commit on compile/rollback, branch management
- **Cross-Platform** - Pure Markdown format, viewable in Obsidian, VS Code, any editor
- **Cross-Tool Compatible** - Works with Qoder, Cursor, Copilot, Claude Code, and other AI coding tools

## Quick Start

### Initialize

```bash
wiki init
```

Follow the interactive prompts to:
- Specify your knowledge base path (or use default)
- Initialize Git repository (optional)
- Connect to remote repository (optional)

### Add Raw Content

Place your articles, papers, notes, or any reference material in the `raw/` folder:

```
my-knowledge-base/
├── raw/
│   ├── article1.html
│   ├── paper.pdf
│   ├── notes.md
│   └── ...
└── wiki/          (created by compile)
```

### Compile

```bash
wiki compile
```

The LLM will:
1. Detect new/modified files (incremental)
2. Clean dirty content (ads, navigation, etc.)
3. Read and analyze each file thoroughly
4. Generate structured wiki pages with:
   - Concept entries
   - People entries
   - Key insights and arguments
   - Data and statistics
   - Case studies
   - Cross-references via `[[wikilinks]]`

### Ask Questions

```bash
wiki qa "What is the relationship between X and Y?"
```

Answers are strictly based on your wiki content only, with source citations.

### Multiple Knowledge Bases

Register and manage multiple knowledge bases:

```bash
# Register a new knowledge base
wiki kb add ai-notes D:\knowledge-base\ai
wiki kb add code-notes D:\knowledge-base\code
wiki kb add research D:\knowledge-base\research

# List all registered knowledge bases
wiki kb list

# Switch default knowledge base
wiki kb switch ai-notes

# Target a specific KB for operations
wiki compile --kb ai-notes
wiki qa "What is attention mechanism?" --kb ai-notes
wiki status --kb code-notes
wiki view --kb research
```

### Check Status

```bash
wiki status
```

Shows:
- File counts (raw/wiki)
- Last compile time
- Git status
- Storage usage

### View Knowledge Base

```bash
wiki view
```

Opens your knowledge base in:
- Obsidian (if installed)
- VS Code
- File manager

### Quality Check

```bash
wiki lint
```

Automatically:
- Fixes broken wiki links
- Creates missing concept files
- Expands coverage for under-referenced topics
- Reports quality metrics

## Commands Reference

| Command | Description |
|---------|-------------|
| `wiki init` | Initialize new knowledge base |
| `wiki compile` | Compile raw articles into wiki |
| `wiki clean <file>` | Clean dirty content from file(s) |
| `wiki lint` | Quality check and auto-fix |
| `wiki qa "question"` | Ask wiki-based questions |
| `wiki status` | Show statistics and Git status |
| `wiki view` | Open knowledge base viewer |
| `wiki git <cmd>` | Git operations (status, log, diff, rollback) |
| `wiki remote <cmd>` | Remote operations (setup, sync, pull) |
| `wiki kb list` | List all registered knowledge bases |
| `wiki kb add <n> <p>` | Register a knowledge base |
| `wiki kb switch <name>` | Switch default knowledge base |
| `wiki kb remove <name>` | Remove a knowledge base registration |

## Project Structure

```
personal-wiki/
├── SKILL.md              # Skill definition for AI coding tools
├── index.js              # Main entry point
├── package.json          # Project metadata
├── prompts/              # LLM prompt templates
│   ├── compile.md        # Expert-level compilation prompt
│   ├── clean.md          # Document cleaning prompt
│   ├── qa.md             # Q&A prompt (strict wiki-only)
│   └── lint.md           # Quality check prompt
├── src/
│   ├── commands/         # Command implementations
│   │   ├── init.js
│   │   ├── compile.js
│   │   ├── clean.js
│   │   ├── lint.js
│   │   ├── qa.js
│   │   ├── status.js
│   │   ├── view.js
│   │   ├── git.js
│   │   └── remote.js
│   └── utils/            # Shared utilities
│       ├── config.js     # Configuration management
│       ├── file.js       # File operations and hashing
│       ├── git.js        # Git operations
│       └── llm.js        # LLM interaction utilities
└── README.md             # This file
```

## Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Markdown | `.md`, `.markdown` | Best quality, minimal cleaning |
| Plain Text | `.txt`, `.text` | Good quality |
| HTML | `.html`, `.htm` | Requires cleaning (ads, navigation) |
| PDF | `.pdf` | Requires extraction (use markdown-converter skill) |
| Word | `.docx` | Requires extraction |
| CSV | `.csv` | Structured data, preserved as tables |
| JSON | `.json` | Structured data |

### File Size Limits

- Recommended: < 500KB per file
- Maximum: 2MB per file (LLM context window constraint)
- Large files will be automatically split during compilation

### File Count

- No hard limit, but recommended: < 1000 files per compilation batch
- Incremental compilation makes large knowledge bases manageable

## Git Integration

Knowledge bases are automatically version-controlled:

- **Auto-commit** - Every compile/lint creates a Git commit
- **Rollback** - `wiki git rollback` to revert to any previous state
- **Branch management** - Create branches for experimental compilations
- **Remote sync** - Push to GitHub/GitLab for backup and collaboration

## Obsidian Integration

The `wiki/` directory uses pure Markdown with `[[wikilink]]` syntax, fully compatible with Obsidian:

1. Open Obsidian
2. File > Open Folder as Vault
3. Select your `wiki/` directory
4. Enjoy graph view, backlinks, and search

**Note**: Obsidian is NOT required. The wiki is viewable in any Markdown editor or browser.

## Cross-Tool Compatibility

This skill uses the `SKILL.md` format, supported by:

- Qoder / Qoderwork
- Cursor
- GitHub Copilot
- Claude Code
- Any AI coding tool that supports skill/plugins

## Configuration

Create a `.wiki-config.json` in your knowledge base root:

```json
{
  "rawDir": "raw",
  "wikiDir": "wiki",
  "stateFile": ".kb-state.json",
  "gitEnabled": true,
  "autoCommit": true,
  "language": "en",
  "maxFileSize": 2097152,
  "supportedExtensions": [".md", ".txt", ".html", ".htm", ".csv", ".json"]
}
```

## License

MIT

## Acknowledgments

- Inspired by Andrej Karpathy's personal knowledge base method
- Built for AI-assisted knowledge extraction and organization
