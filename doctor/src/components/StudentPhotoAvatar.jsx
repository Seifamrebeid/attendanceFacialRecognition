import React, { useState, useEffect } from 'react';
import { Avatar, CircularProgress, Box } from '@mui/material';

/**
 * StudentPhotoAvatar - Custom component to display student photos from Google Drive
 * Tries multiple URL formats and falls back to initials if all fail
 */
const StudentPhotoAvatar = ({ photoUrl, name, sx = { width: 50, height: 50 } }) => {
    const [displayUrl, setDisplayUrl] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadImage = async () => {
            const urlsToTry = getImageUrlsToTry(photoUrl, name);

            if (urlsToTry.length === 0) {
                // Determine if we should treat this as an error or just nothing to show
                // If there were no URLs to try (no photoUrl and no Name?), just show initials
                setImageError(true);
                setLoading(false);
                return;
            }

            // Try each URL in sequence
            for (const url of urlsToTry) {
                try {
                    const works = await testImageUrl(url);
                    if (works) {
                        setDisplayUrl(url);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.warn(`Failed to test URL: ${url}`, err);
                }
            }

            // If all URLs failed, show initials
            setImageError(true);
            setLoading(false);
        };

        loadImage();
    }, [photoUrl, name]);

    // If image failed to load, show initials
    if (imageError) {
        return (
            <Avatar sx={sx} alt={name}>
                {name?.charAt(0)?.toUpperCase() || '?'}
            </Avatar>
        );
    }

    // If image is loading, show spinner
    if (loading) {
        return (
            <Box sx={{ ...sx, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: '50%' }}>
                <CircularProgress size={Math.max(sx.width * 0.6, 24)} />
            </Box>
        );
    }

    // If image loaded successfully, display it
    return (
        <Avatar
            src={displayUrl}
            alt={name}
            sx={sx}
            imgProps={{
                referrerPolicy: "no-referrer",
                crossOrigin: "anonymous"
            }}
            onError={() => setImageError(true)}
        >
            {name?.charAt(0)?.toUpperCase() || '?'}
        </Avatar>
    );
};

/**
 * Extract Google Drive file ID from various URL formats
 */
const extractGoogleDriveId = (url) => {
    if (!url) return null;

    // If it's already just an ID
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

const getProxyImageUrl = (googleDriveUrl) => {
    const fileId = extractGoogleDriveId(googleDriveUrl);

    if (!fileId) {
        return null;
    }

    return {
        fileId,
        direct: `https://drive.google.com/uc?export=view&id=${fileId}`,
        directExport: `https://drive.google.com/uc?export=download&id=${fileId}`,
        thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`,
        publicShare: `https://lh3.googleusercontent.com/d/${fileId}=w400-h400`,
    };
};

/**
 * Get alternative image URLs to try in order
 */
const getImageUrlsToTry = (googleDriveUrl, name) => {
    const urls = [];

    // 1. Try local files by name (user request: "make it by the name")
    if (name) {
        // Handle names with spaces for URLs
        const encodedName = encodeURIComponent(name);
        const nameWithUnderscores = name.replace(/\s+/g, '_');

        urls.push(`/student_photos/${name}.jpg`);
        urls.push(`/student_photos/${name}.png`);
        urls.push(`/student_photos/${name}.jpeg`);
        urls.push(`/student_photos/${encodedName}.jpg`);
        urls.push(`/student_photos/${nameWithUnderscores}.jpg`);
    }

    // 2. Try Google Drive URLs if provided
    if (googleDriveUrl) {
        const driveUrls = getProxyImageUrl(googleDriveUrl);
        if (driveUrls) {
            urls.push(driveUrls.thumbnail);
            urls.push(driveUrls.direct);
            urls.push(driveUrls.publicShare);
            urls.push(driveUrls.directExport);
        }
    }

    return urls;
};

/**
 * Create an image element to test if a URL works
 */
const testImageUrl = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            resolve(false);
        }, 3000); // 3 second timeout

        img.onload = () => {
            clearTimeout(timeout);
            resolve(true);
        };

        img.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };

        img.src = url;
    });
};

export default StudentPhotoAvatar;
