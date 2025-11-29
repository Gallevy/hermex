const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

/**
 * Find files matching a glob pattern
 * @param {string} pattern - Glob pattern
 * @param {Object} options - Options for glob
 * @returns {Promise<string[]>} Array of file paths
 */
async function findFiles(pattern, options = {}) {
  const {
    ignorePatterns = [],
    maxFiles = 1000,
    cwd = process.cwd(),
  } = options;

  const allFiles = await glob(pattern, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", ...ignorePatterns],
    nodir: true,
    cwd,
    absolute: true,
    windowsPathsNoEscape: true,
  });

  // Filter to only React-related file types
  const reactFiles = allFiles.filter((file) => {
    const ext = path.extname(file);
    return [".tsx", ".jsx", ".ts", ".js"].includes(ext);
  });

  // Limit number of files
  if (reactFiles.length > maxFiles) {
    console.warn(
      `Warning: Found ${reactFiles.length} files, limiting to ${maxFiles}`
    );
    return reactFiles.slice(0, maxFiles);
  }

  return reactFiles;
}

/**
 * Read file content
 * @param {string} filePath - Path to file
 * @returns {string} File content
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Write file content
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 */
function writeFile(filePath, content) {
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Get file extension
 * @param {string} filePath - Path to file
 * @returns {string} File extension (without dot)
 */
function getFileExtension(filePath) {
  return path.extname(filePath).slice(1);
}

/**
 * Check if file is a React file type
 * @param {string} filePath - Path to file
 * @returns {boolean} True if React file type
 */
function isReactFile(filePath) {
  const ext = getFileExtension(filePath);
  return ["tsx", "jsx", "ts", "js"].includes(ext);
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Path to directory
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get relative path from base directory
 * @param {string} filePath - Absolute file path
 * @param {string} basePath - Base directory path
 * @returns {string} Relative path
 */
function getRelativePath(filePath, basePath) {
  return path.relative(basePath, filePath);
}

/**
 * Normalize path separators for cross-platform compatibility
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path (forward slashes)
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

/**
 * Get files by type from a directory
 * @param {string} dirPath - Directory path
 * @param {string[]} extensions - Array of extensions (e.g., ['.tsx', '.jsx'])
 * @returns {Promise<string[]>} Array of file paths
 */
async function getFilesByType(dirPath, extensions = [".tsx", ".jsx", ".ts", ".js"]) {
  const normalizedPath = normalizePath(dirPath);
  const pattern = `${normalizedPath}/**/*{${extensions.join(",")}}`;

  const files = await glob(pattern, {
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    nodir: true,
    windowsPathsNoEscape: true,
  });

  return files;
}

/**
 * Count files by extension in a directory
 * @param {string} dirPath - Directory path
 * @returns {Promise<Object>} Map of extensions to counts
 */
async function countFilesByExtension(dirPath) {
  const files = await getFilesByType(dirPath);
  const counts = {};

  files.forEach((file) => {
    const ext = getFileExtension(file);
    counts[ext] = (counts[ext] || 0) + 1;
  });

  return counts;
}

/**
 * Read JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object} Parsed JSON object
 */
function readJsonFile(filePath) {
  const content = readFile(filePath);
  return JSON.parse(content);
}

/**
 * Write JSON file
 * @param {string} filePath - Path to JSON file
 * @param {Object} data - Data to write
 */
function writeJsonFile(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  writeFile(filePath, content);
}

module.exports = {
  findFiles,
  readFile,
  writeFile,
  fileExists,
  getFileExtension,
  isReactFile,
  ensureDirectory,
  getRelativePath,
  normalizePath,
  getFilesByType,
  countFilesByExtension,
  readJsonFile,
  writeJsonFile,
};
