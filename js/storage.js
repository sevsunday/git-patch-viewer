/**
 * Storage Manager
 * Handles localStorage for saving and managing patches
 */

const StorageManager = (() => {
  const STORAGE_KEY = 'git-patch-viewer-patches';
  const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB (conservative limit)

  /**
   * Get all saved patches
   * @returns {Array<Object>} Array of saved patches
   */
  function getAllPatches() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load patches from storage:', error);
      return [];
    }
  }

  /**
   * Save a patch
   * @param {Object} patchData - Parsed patch data
   * @param {string} name - Patch name (optional)
   * @returns {Object} Saved patch object with ID
   */
  function savePatch(patchData, name = '') {
    try {
      // Check storage availability
      checkStorageQuota();

      const patches = getAllPatches();
      
      // Generate unique ID
      const id = generateID();
      
      // Create patch entry
      const patchEntry = {
        id,
        name: name || generatePatchName(patchData),
        date: new Date().toISOString(),
        data: patchData.raw, // Store raw patch text
        metadata: patchData.metadata,
        stats: patchData.stats,
        size: patchData.raw.length,
      };

      // Add to patches array
      patches.unshift(patchEntry); // Add to beginning

      // Limit to 50 patches
      if (patches.length > 50) {
        patches.splice(50);
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patches));

      console.log('✅ Patch saved:', id);
      return patchEntry;
    } catch (error) {
      console.error('Failed to save patch:', error);
      throw new Error('Failed to save patch: ' + error.message);
    }
  }

  /**
   * Load a patch by ID
   * @param {string} id - Patch ID
   * @returns {Object|null} Patch entry or null
   */
  function loadPatch(id) {
    const patches = getAllPatches();
    return patches.find(p => p.id === id) || null;
  }

  /**
   * Check if patch with same content already exists
   * @param {string} patchData - Raw patch data
   * @returns {Object|null} Existing patch entry or null
   */
  function findPatchByContent(patchData) {
    const patches = getAllPatches();
    return patches.find(p => p.data === patchData) || null;
  }

  /**
   * Delete a patch by ID
   * @param {string} id - Patch ID
   * @returns {boolean} Success status
   */
  function deletePatch(id) {
    try {
      const patches = getAllPatches();
      const filtered = patches.filter(p => p.id !== id);
      
      if (filtered.length === patches.length) {
        return false; // Patch not found
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('🗑️ Patch deleted:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete patch:', error);
      return false;
    }
  }

  /**
   * Rename a patch
   * @param {string} id - Patch ID
   * @param {string} newName - New name
   * @returns {boolean} Success status
   */
  function renamePatch(id, newName) {
    try {
      const patches = getAllPatches();
      const patch = patches.find(p => p.id === id);
      
      if (!patch) return false;

      patch.name = newName;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patches));
      return true;
    } catch (error) {
      console.error('Failed to rename patch:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage info
   */
  function getStorageInfo() {
    try {
      const patches = getAllPatches();
      const stored = localStorage.getItem(STORAGE_KEY) || '';
      const usedBytes = stored.length * 2; // Rough estimate (UTF-16)
      const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
      const percentUsed = ((usedBytes / MAX_STORAGE_SIZE) * 100).toFixed(1);

      return {
        patchCount: patches.length,
        usedBytes,
        usedMB,
        maxMB: (MAX_STORAGE_SIZE / (1024 * 1024)).toFixed(2),
        percentUsed: parseFloat(percentUsed),
        isNearLimit: percentUsed > 80,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        patchCount: 0,
        usedBytes: 0,
        usedMB: '0',
        maxMB: '5',
        percentUsed: 0,
        isNearLimit: false,
      };
    }
  }

  /**
   * Check storage quota and warn if near limit
   */
  function checkStorageQuota() {
    const info = getStorageInfo();
    
    if (info.percentUsed > 90) {
      throw new Error('Storage quota exceeded! Please delete some saved patches.');
    } else if (info.isNearLimit) {
      console.warn('⚠️ Storage is nearing limit:', info.percentUsed + '%');
    }
  }

  /**
   * Search patches by name or metadata
   * @param {string} query - Search query
   * @returns {Array<Object>} Filtered patches
   */
  function searchPatches(query) {
    const patches = getAllPatches();
    const lowerQuery = query.toLowerCase();

    return patches.filter(patch => {
      const nameMatch = patch.name.toLowerCase().includes(lowerQuery);
      const messageMatch = patch.metadata?.message?.toLowerCase().includes(lowerQuery) || false;
      const authorMatch = patch.metadata?.author?.toLowerCase().includes(lowerQuery) || false;
      
      return nameMatch || messageMatch || authorMatch;
    });
  }

  /**
   * Sort patches
   * @param {Array<Object>} patches - Patches to sort
   * @param {string} sortBy - Sort field (date, name, size)
   * @param {string} order - Sort order (asc, desc)
   * @returns {Array<Object>} Sorted patches
   */
  function sortPatches(patches, sortBy = 'date', order = 'desc') {
    const sorted = [...patches];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
        default:
          comparison = new Date(a.date) - new Date(b.date);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Get recent patches (last 5)
   * @returns {Array<Object>} Recent patches
   */
  function getRecentPatches(count = 5) {
    const patches = getAllPatches();
    return patches.slice(0, count);
  }

  /**
   * Clear all saved patches
   * @returns {boolean} Success status
   */
  function clearAllPatches() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ All patches cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear patches:', error);
      return false;
    }
  }

  /**
   * Export patches as JSON
   * @returns {string} JSON string of all patches
   */
  function exportPatches() {
    const patches = getAllPatches();
    return JSON.stringify(patches, null, 2);
  }

  /**
   * Import patches from JSON
   * @param {string} jsonString - JSON string
   * @returns {number} Number of patches imported
   */
  function importPatches(jsonString) {
    try {
      const importedPatches = JSON.parse(jsonString);
      
      if (!Array.isArray(importedPatches)) {
        throw new Error('Invalid format: expected array');
      }

      const currentPatches = getAllPatches();
      
      // Merge patches (avoid duplicates by ID)
      const merged = [...currentPatches];
      let importCount = 0;

      importedPatches.forEach(patch => {
        if (!merged.find(p => p.id === patch.id)) {
          merged.push(patch);
          importCount++;
        }
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      console.log(`📥 Imported ${importCount} patches`);
      return importCount;
    } catch (error) {
      console.error('Failed to import patches:', error);
      throw new Error('Failed to import patches: ' + error.message);
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  function generateID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate patch name from metadata
   * @param {Object} patchData - Parsed patch data
   * @returns {string} Generated name
   */
  function generatePatchName(patchData) {
    const { metadata, stats } = patchData;
    
    // Try to use commit message
    if (metadata.message) {
      const shortMessage = metadata.message.split('\n')[0].substring(0, 50);
      return shortMessage;
    }

    // Try to use first filename
    if (patchData.files && patchData.files.length > 0) {
      const firstFile = patchData.files[0].newPath || patchData.files[0].oldPath;
      const filename = firstFile.split('/').pop();
      return `Patch for ${filename}`;
    }

    // Default name with stats
    return `Patch (${stats.filesChanged} files, +${stats.additions} -${stats.deletions})`;
  }

  /**
   * Format patch date for display
   * @param {string} isoDate - ISO date string
   * @returns {string} Formatted date
   */
  function formatPatchDate(isoDate) {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays < 7) {
        return diffDays + ' days ago';
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (error) {
      return isoDate;
    }
  }

  // Public API
  return {
    getAllPatches,
    savePatch,
    loadPatch,
    deletePatch,
    renamePatch,
    getStorageInfo,
    searchPatches,
    sortPatches,
    getRecentPatches,
    clearAllPatches,
    exportPatches,
    importPatches,
    formatPatchDate,
    findPatchByContent,
  };
})();

