/**
 * Image Proxy Utilities
 * Converts Google Drive IDs to proxy URLs using multiple strategies
 */

// Get the Firebase functions base URL
// In development: http://localhost:5001/PROJECT_ID/us-central1/
// In production: https://us-central1-PROJECT_ID.cloudfunctions.net/
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 
    'https://us-central1-seifs-digital-portfolio.cloudfunctions.net/';

/**
 * Extract Google Drive file ID from various URL formats
 * @param {string} url - Google Drive URL or file ID
 * @returns {string|null} File ID or null if not found
 */
export const extractGoogleDriveId = (url) => {
    if (!url) return null;

    // If it's already just an ID (long string of alphanumeric characters)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) {
        return url;
    }

    // Handle drive.google.com/open?id= format
    if (url.includes('drive.google.com/open?id=')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    // Handle drive.google.com/file/d/ format
    if (url.includes('/d/')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    // Handle drive.google.com/uc?export=view&id= format
    if (url.includes('uc?export=view')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    return null;
};

/**
 * Get multiple image URL options for a Google Drive file
 * @param {string} googleDriveUrl - Google Drive URL or file ID
 * @returns {Object} Object with multiple URL options
 */
export const getProxyImageUrl = (googleDriveUrl) => {
    const fileId = extractGoogleDriveId(googleDriveUrl);
    
    if (!fileId) {
        return null;
    }

    return {
        fileId,
        // Direct Google Drive URL
        direct: `https://drive.google.com/uc?export=view&id=${fileId}`,
        // Cloud function proxy
        proxy: `${FUNCTIONS_BASE_URL}proxyImage?id=${fileId}`,
        // Alternative direct URL
        directExport: `https://drive.google.com/uc?export=download&id=${fileId}`,
        // Public Share URL pattern (if file is publicly shared)
        publicShare: `https://lh3.googleusercontent.com/d/${fileId}=w400-h400`,
    };
};

/**
 * Get alternative image URLs to try in order
 * Ordered by most likely to work first
 * @param {string} googleDriveUrl - Google Drive URL or file ID
 * @returns {Array<string>} Array of URLs to try in order
 */
export const getImageUrlsToTry = (googleDriveUrl) => {
    const urls = getProxyImageUrl(googleDriveUrl);
    
    if (!urls) {
        return [];
    }

    // Return URLs in order of preference
    return [
        urls.proxy,         // Cloud function proxy (most reliable, but slower)
        urls.direct,        // Direct Google Drive URL
        urls.publicShare,   // Public share URL pattern
        urls.directExport,  // Alternative export format
    ];
};

/**
 * Create an image element to test if a URL works
 * @param {string} url - URL to test
 * @returns {Promise<boolean>} True if image loads successfully
 */
export const testImageUrl = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        
        const timeout = setTimeout(() => {
            resolve(false);
        }, 3000);

        img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };

        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.src = url;
    });
};

export default {
    extractGoogleDriveId,
    getProxyImageUrl,
    getImageUrlsToTry,
    testImageUrl,
};
