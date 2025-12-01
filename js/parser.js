/**
 * Patch Parser
 * Parses git patches and extracts metadata, files, and statistics
 */

const PatchParser = (() => {
  /**
   * Parse a patch string and extract all information
   * @param {string} patchText - The raw patch text
   * @returns {Object} Parsed patch data
   */
  function parse(patchText) {
    if (!patchText || typeof patchText !== 'string') {
      throw new Error('Invalid patch: empty or not a string');
    }

    const lines = patchText.split('\n');
    const result = {
      metadata: extractMetadata(lines),
      files: [],
      stats: {
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      },
      raw: patchText,
    };

    // Parse files
    result.files = parseFiles(lines);
    
    // Calculate statistics
    result.stats = calculateStats(result.files);

    return result;
  }

  /**
   * Extract git metadata from patch headers
   * @param {Array<string>} lines - Patch lines
   * @returns {Object} Metadata object
   */
  function extractMetadata(lines) {
    const metadata = {
      commitHash: null,
      author: null,
      authorEmail: null,
      date: null,
      message: '',
      refs: [],
    };

    let inMessage = false;
    let messageLines = [];

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];

      // Commit hash from format-patch
      if (line.startsWith('From ')) {
        const match = line.match(/^From ([0-9a-f]{40})/);
        if (match) {
          metadata.commitHash = match[1];
        }
      }

      // Author
      if (line.startsWith('From: ')) {
        const match = line.match(/^From: (.+?) <(.+?)>/);
        if (match) {
          metadata.author = match[1];
          metadata.authorEmail = match[2];
        } else {
          metadata.author = line.substring(6).trim();
        }
      }

      // Date
      if (line.startsWith('Date: ')) {
        metadata.date = line.substring(6).trim();
      }

      // Subject/Message start
      if (line.startsWith('Subject: ')) {
        inMessage = true;
        messageLines.push(line.substring(9).trim());
        continue;
      }

      // Continue message
      if (inMessage) {
        if (line.trim() === '' || line.startsWith('---')) {
          inMessage = false;
        } else {
          messageLines.push(line.trim());
        }
      }

      // Refs (branches, tags)
      if (line.match(/^\s*\(.*\)$/)) {
        const refs = line.match(/\(([^)]+)\)/);
        if (refs) {
          metadata.refs = refs[1].split(',').map(r => r.trim());
        }
      }
    }

    metadata.message = messageLines.join(' ').trim();

    return metadata;
  }

  /**
   * Parse files from the patch
   * @param {Array<string>} lines - Patch lines
   * @returns {Array<Object>} Array of file objects
   */
  function parseFiles(lines) {
    const files = [];
    let currentFile = null;
    let currentHunk = null;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // File header (diff --git)
      if (line.startsWith('diff --git ')) {
        // Save previous file
        if (currentFile) {
          if (currentHunk) {
            currentFile.hunks.push(currentHunk);
            currentHunk = null;
          }
          files.push(currentFile);
        }

        // Start new file
        const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
        if (match) {
          currentFile = {
            oldPath: match[1],
            newPath: match[2],
            type: 'modified',
            hunks: [],
            additions: 0,
            deletions: 0,
            isBinary: false,
          };
        }
      }

      // New file mode
      if (line.startsWith('new file mode') && currentFile) {
        currentFile.type = 'added';
        currentFile.oldPath = '/dev/null';
      }

      // Deleted file mode
      if (line.startsWith('deleted file mode') && currentFile) {
        currentFile.type = 'deleted';
        currentFile.newPath = '/dev/null';
      }

      // Renamed file
      if (line.startsWith('rename from') && currentFile) {
        currentFile.type = 'renamed';
      }

      // Binary files
      if (line.match(/^Binary files .* differ/) && currentFile) {
        currentFile.isBinary = true;
      }

      // Hunk header (@@ -X,Y +A,B @@)
      if (line.startsWith('@@') && currentFile) {
        // Save previous hunk
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }

        // Parse hunk header
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
        if (match) {
          currentHunk = {
            oldStart: parseInt(match[1]),
            oldLines: match[2] ? parseInt(match[2]) : 1,
            newStart: parseInt(match[3]),
            newLines: match[4] ? parseInt(match[4]) : 1,
            heading: match[5].trim(),
            lines: [],
          };
        }
      }

      // Hunk content lines
      if (currentHunk && currentFile && !currentFile.isBinary) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentHunk.lines.push({ type: 'add', content: line.substring(1) });
          currentFile.additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentHunk.lines.push({ type: 'del', content: line.substring(1) });
          currentFile.deletions++;
        } else if (line.startsWith(' ') && currentHunk.lines.length > 0) {
          currentHunk.lines.push({ type: 'context', content: line.substring(1) });
        }
      }

      i++;
    }

    // Save last file
    if (currentFile) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      files.push(currentFile);
    }

    return files;
  }

  /**
   * Calculate overall statistics
   * @param {Array<Object>} files - Parsed files
   * @returns {Object} Statistics object
   */
  function calculateStats(files) {
    const stats = {
      filesChanged: files.length,
      additions: 0,
      deletions: 0,
    };

    files.forEach(file => {
      stats.additions += file.additions;
      stats.deletions += file.deletions;
    });

    return stats;
  }

  /**
   * Get file extension
   * @param {string} filePath - File path
   * @returns {string} File extension
   */
  function getFileExtension(filePath) {
    const match = filePath.match(/\.([^.]+)$/);
    return match ? match[1] : '';
  }

  /**
   * Detect programming language from file path
   * @param {string} filePath - File path
   * @returns {string} Language identifier for syntax highlighting
   */
  function detectLanguage(filePath) {
    const ext = getFileExtension(filePath).toLowerCase();
    
    const languageMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'html': 'markup',
      'xml': 'markup',
      'svg': 'markup',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'sql': 'sql',
      'dockerfile': 'docker',
      'makefile': 'makefile',
    };

    // Check by filename for special cases
    const filename = filePath.split('/').pop().toLowerCase();
    if (filename === 'dockerfile') return 'docker';
    if (filename === 'makefile') return 'makefile';
    if (filename === '.gitignore') return 'git';

    return languageMap[ext] || 'plaintext';
  }

  /**
   * Group files by directory
   * @param {Array<Object>} files - Parsed files
   * @returns {Object} Files grouped by directory
   */
  function groupFilesByDirectory(files) {
    const grouped = {};

    files.forEach(file => {
      const path = file.newPath !== '/dev/null' ? file.newPath : file.oldPath;
      const parts = path.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';

      if (!grouped[dir]) {
        grouped[dir] = [];
      }

      grouped[dir].push(file);
    });

    return grouped;
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   * @param {string} dateString - Date string
   * @returns {string} Formatted relative time
   */
  function formatRelativeTime(dateString) {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      const diffWeek = Math.floor(diffDay / 7);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);

      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
      if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
      if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
      if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? 's' : ''} ago`;
      if (diffMonth < 12) return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
      return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Validate patch format
   * @param {string} patchText - Patch text
   * @returns {boolean} True if valid patch
   */
  function isValidPatch(patchText) {
    if (!patchText || typeof patchText !== 'string') return false;
    
    // Check for common patch indicators
    const indicators = [
      /^diff --git/m,
      /^--- /m,
      /^\+\+\+ /m,
      /^@@ /m,
    ];

    return indicators.some(regex => regex.test(patchText));
  }

  // Public API
  return {
    parse,
    detectLanguage,
    groupFilesByDirectory,
    formatRelativeTime,
    isValidPatch,
  };
})();



