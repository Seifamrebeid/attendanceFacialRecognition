// Google Drive Service
// Fetches student photos from Google Drive

import { google } from 'googleapis';

// Initialize Google Drive API
const getGoogleDriveClient = () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: './google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
};

/**
 * Get photo URL from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<string>} Public URL to the photo
 */
export const getPhotoUrl = async (fileId) => {
    try {
        if (!fileId) return null;

        // For public files, you can use direct link
        // Format: https://drive.google.com/uc?export=view&id=FILE_ID
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } catch (error) {
        console.error('Error getting photo URL:', error);
        return null;
    }
};

/**
 * Get photo as base64 data
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<string>} Base64 encoded image data
 */
export const getPhotoAsBase64 = async (fileId) => {
    try {
        if (!fileId) return null;

        const drive = getGoogleDriveClient();

        const response = await drive.files.get(
            {
                fileId: fileId,
                alt: 'media',
            },
            { responseType: 'arraybuffer' }
        );

        // Convert to base64
        const base64 = Buffer.from(response.data).toString('base64');

        // Get file metadata to determine MIME type
        const metadata = await drive.files.get({
            fileId: fileId,
            fields: 'mimeType',
        });

        const mimeType = metadata.data.mimeType || 'image/jpeg';

        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Error fetching photo from Drive:', error);
        return null;
    }
};

/**
 * List all photos in a folder
 * @param {string} folderId - Google Drive folder ID
 * @returns {Promise<Array>} Array of file objects
 */
export const listPhotosInFolder = async (folderId) => {
    try {
        const drive = getGoogleDriveClient();

        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, mimeType, webViewLink)',
            pageSize: 100,
        });

        return response.data.files || [];
    } catch (error) {
        console.error('Error listing photos from Drive:', error);
        throw error;
    }
};

/**
 * Make a file publicly accessible (if needed)
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<boolean>} Success status
 */
export const makeFilePublic = async (fileId) => {
    try {
        const drive = getGoogleDriveClient();

        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        return true;
    } catch (error) {
        console.error('Error making file public:', error);
        return false;
    }
};
