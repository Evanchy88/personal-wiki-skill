const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_PATHS = {
  win32: 'D:\\knowledge-base',
  darwin: path.join(os.homedir(), 'knowledge-base'),
  linux: path.join(os.homedir(), 'knowledge-base')
};

// Multi-KB config file location
const MULTI_KB_CONFIG = path.join(os.homedir(), '.kb-config.json');

/**
 * Resolve knowledge base path.
 * Priority: explicit path > --kb name lookup > default path
 */
function resolveKbPath(userInput, options = {}) {
  // 1. Explicit path provided
  if (userInput) {
    return path.resolve(userInput);
  }

  // 2. Look up by KB name (--kb flag)
  if (options.kb) {
    const multiConfig = loadMultiKbConfig();
    const kbEntry = multiConfig.kbs && multiConfig.kbs[options.kb];
    if (kbEntry) {
      return path.resolve(kbEntry.path);
    }
    throw new Error(`知识库 "${options.kb}" 未找到。运行 wiki list 查看已注册的知识库。`);
  }

  // 3. Use default KB (if set) or first registered KB
  const multiConfig = loadMultiKbConfig();
  if (multiConfig.kbs) {
    const defaultName = multiConfig.defaultKb;
    if (defaultName && multiConfig.kbs[defaultName]) {
      return path.resolve(multiConfig.kbs[defaultName].path);
    }
    // Fall back to first registered KB
    const firstKey = Object.keys(multiConfig.kbs)[0];
    if (firstKey) {
      return path.resolve(multiConfig.kbs[firstKey].path);
    }
  }

  // 4. Legacy: check old defaultPath
  if (multiConfig.defaultPath) {
    return path.resolve(multiConfig.defaultPath);
  }

  // 5. Platform default
  return DEFAULT_PATHS[process.platform] || DEFAULT_PATHS.linux;
}

function loadGlobalConfig() {
  return loadMultiKbConfig();
}

function loadMultiKbConfig() {
  if (fs.existsSync(MULTI_KB_CONFIG)) {
    try {
      return JSON.parse(fs.readFileSync(MULTI_KB_CONFIG, 'utf-8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveGlobalConfig(config) {
  const existing = loadMultiKbConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(MULTI_KB_CONFIG, JSON.stringify(merged, null, 2));
}

function saveMultiKbConfig(config) {
  const existing = loadMultiKbConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(MULTI_KB_CONFIG, JSON.stringify(merged, null, 2));
}

/**
 * Register a new knowledge base.
 * @param {string} name - KB name
 * @param {string} kbPath - Absolute path to KB
 */
function addKb(name, kbPath) {
  const config = loadMultiKbConfig();
  if (!config.kbs) config.kbs = {};
  
  const resolvedPath = path.resolve(kbPath);
  config.kbs[name] = {
    path: resolvedPath,
    createdAt: new Date().toISOString(),
    description: config.kbs[name]?.description || ''
  };
  
  // Set as default if first KB
  if (!config.defaultKb) {
    config.defaultKb = name;
  }
  
  saveMultiKbConfig(config);
  return config.kbs[name];
}

/**
 * Remove a knowledge base registration.
 */
function removeKb(name) {
  const config = loadMultiKbConfig();
  if (!config.kbs || !config.kbs[name]) {
    throw new Error(`知识库 "${name}" 未找到。`);
  }
  
  delete config.kbs[name];
  
  // Reset default if it was removed
  if (config.defaultKb === name) {
    const remaining = Object.keys(config.kbs);
    config.defaultKb = remaining.length > 0 ? remaining[0] : undefined;
  }
  
  saveMultiKbConfig(config);
}

/**
 * Set default knowledge base.
 */
function setDefaultKb(name) {
  const config = loadMultiKbConfig();
  if (!config.kbs || !config.kbs[name]) {
    throw new Error(`知识库 "${name}" 未找到。`);
  }
  config.defaultKb = name;
  saveMultiKbConfig(config);
}

/**
 * Get all registered knowledge bases.
 */
function listKbs() {
  const config = loadMultiKbConfig();
  return config.kbs || {};
}

/**
 * Get knowledge base by name.
 */
function getKbByName(name) {
  const config = loadMultiKbConfig();
  return config.kbs ? config.kbs[name] : null;
}

function loadKbState(kbPath) {
  const statePath = path.join(kbPath, '.kb-state.json');
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch (e) {
      return { version: 1, files: {} };
    }
  }
  return { version: 1, files: {} };
}

function saveKbState(kbPath, state) {
  const statePath = path.join(kbPath, '.kb-state.json');
  state.lastCompile = new Date().toISOString();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

module.exports = {
  resolveKbPath,
  loadGlobalConfig,
  saveGlobalConfig,
  loadMultiKbConfig,
  saveMultiKbConfig,
  addKb,
  removeKb,
  setDefaultKb,
  listKbs,
  getKbByName,
  loadKbState,
  saveKbState,
  DEFAULT_PATHS
};
