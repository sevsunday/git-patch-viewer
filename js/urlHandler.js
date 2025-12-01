/**
 * URL Handler
 * Handles URL parameters, Base64 encoding/decoding, and compression
 * Platform-agnostic: works on any static hosting service
 */

const URLHandler = (() => {
  /**
   * Get query parameter from URL
   * @param {string} name - Parameter name
   * @returns {string|null} Parameter value
   */
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /**
   * Check if patch parameter exists in URL
   * @returns {boolean} True if patch parameter exists
   */
  function hasPatchInURL() {
    return getQueryParam('patch') !== null;
  }

  /**
   * Get patch data from URL
   * @returns {string|null} Decoded patch data or null
   */
  function getPatchFromURL() {
    const encoded = getQueryParam('patch');
    if (!encoded) return null;

    try {
      // LZ-String decompression (URL-safe)
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      return decompressed;
    } catch (error) {
      console.error('Failed to decode patch from URL:', error);
      return null;
    }
  }

  /**
   * Generate shareable URL with patch data
   * @param {string} patchData - Raw patch data
   * @param {Object} options - Options (includeTheme, includeMode)
   * @returns {string} Full shareable URL
   */
  function generateShareURL(patchData, options = {}) {
    try {
      // LZ-String compression (URL-safe, optimized for text)
      // This provides better compression than pako for text data
      const encoded = LZString.compressToEncodedURIComponent(patchData);

      // Build URL using browser's native URL API (platform-agnostic)
      const shareUrl = new URL(window.location.href);
      
      // Clear existing query params
      shareUrl.search = '';
      
      // Add patch parameter (already URL-encoded by LZString)
      shareUrl.searchParams.set('patch', encoded);

      // Optionally include theme
      if (options.includeTheme && typeof ThemeManager !== 'undefined') {
        const theme = ThemeManager.getCurrentTheme();
        const mode = ThemeManager.getCurrentMode();
        shareUrl.searchParams.set('theme', theme);
        shareUrl.searchParams.set('mode', mode);
      }

      return shareUrl.toString();
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      throw new Error('Failed to generate share URL: ' + error.message);
    }
  }

  /**
   * Get file parameter from URL
   * @returns {string|null} File path
   */
  function getFileFromURL() {
    return getQueryParam('file');
  }

  /**
   * Get line parameter from URL
   * @returns {number|null} Line number
   */
  function getLineFromURL() {
    const line = getQueryParam('line');
    return line ? parseInt(line, 10) : null;
  }

  /**
   * Get theme from URL
   * @returns {string|null} Theme ID
   */
  function getThemeFromURL() {
    return getQueryParam('theme');
  }

  /**
   * Get mode from URL
   * @returns {string|null} Mode (dark/light)
   */
  function getModeFromURL() {
    return getQueryParam('mode');
  }

  /**
   * Get saved patch ID from URL
   * @returns {string|null} Saved patch ID
   */
  function getSavedPatchIdFromURL() {
    return getQueryParam('savedPatchId');
  }

  /**
   * Generate permalink for a specific file and line
   * @param {string} patchData - Raw patch data
   * @param {string} filePath - File path
   * @param {number} lineNumber - Line number
   * @param {Object} options - Options (includeTheme)
   * @returns {string} Permalink URL
   */
  function generatePermalink(patchData, filePath, lineNumber, options = {}) {
    try {
      // Start with share URL
      const url = generateShareURL(patchData, options);
      const permalinkUrl = new URL(url);

      // Add file and line parameters
      permalinkUrl.searchParams.set('file', filePath);
      permalinkUrl.searchParams.set('line', lineNumber);

      return permalinkUrl.toString();
    } catch (error) {
      console.error('Failed to generate permalink:', error);
      throw new Error('Failed to generate permalink: ' + error.message);
    }
  }

  /**
   * Update URL without page reload
   * @param {Object} params - Parameters to set
   */
  function updateURL(params) {
    const url = new URL(window.location.href);

    // Update parameters
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, params[key]);
      }
    });

    // Update browser history without reload
    window.history.pushState({}, '', url.toString());
  }

  /**
   * Calculate URL length
   * @param {string} url - URL to measure
   * @returns {number} Length in characters
   */
  function getURLLength(url) {
    return url.length;
  }

  /**
   * Check if URL is within safe limits
   * @param {string} url - URL to check
   * @returns {Object} Status object with warnings
   */
  function checkURLSafety(url) {
    const length = getURLLength(url);
    const result = {
      length,
      isOK: true,
      isWarning: false,
      isError: false,
      message: '',
    };

    if (length > 8000) {
      result.isOK = false;
      result.isError = true;
      result.message = 'URL is over 8KB. Most browsers will reject this. Consider saving to localStorage instead.';
    } else if (length > 2000) {
      result.isWarning = true;
      result.message = 'URL is quite long (>2KB). Some older browsers or proxies might have issues.';
    } else {
      result.message = `URL length: ${length} characters. Safe to share.`;
    }

    return result;
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  async function copyToClipboard(text) {
    try {
      // Modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      return success;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Load and apply URL parameters on page load
   */
  function handleURLOnLoad() {
    // Load theme from URL if present
    const theme = getThemeFromURL();
    const mode = getModeFromURL();
    
    if (theme && typeof ThemeManager !== 'undefined') {
      ThemeManager.setThemeFromURL(theme);
    }

    // Note: Patch loading is handled by Viewer.init()
    // to ensure proper initialization order

    return {
      hasPatch: hasPatchInURL(),
      hasFile: getFileFromURL() !== null,
      hasLine: getLineFromURL() !== null,
    };
  }

  /**
   * Clear URL parameters
   */
  function clearURL() {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.pushState({}, '', url.toString());
  }

  /**
   * Get base URL (without query parameters)
   * @returns {string} Base URL
   */
  function getBaseURL() {
    const url = new URL(window.location.href);
    url.search = '';
    return url.toString();
  }

  // Public API
  return {
    getQueryParam,
    hasPatchInURL,
    getPatchFromURL,
    generateShareURL,
    generatePermalink,
    getFileFromURL,
    getLineFromURL,
    getThemeFromURL,
    getModeFromURL,
    getSavedPatchIdFromURL,
    updateURL,
    checkURLSafety,
    copyToClipboard,
    handleURLOnLoad,
    clearURL,
    getBaseURL,
  };
})();

