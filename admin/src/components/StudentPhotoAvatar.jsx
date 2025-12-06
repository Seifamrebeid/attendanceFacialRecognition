import React, { useState, useEffect } from 'react';
import { Avatar, CircularProgress, Box } from '@mui/material';
import { getImageUrlsToTry, testImageUrl } from '../utils/imageProxy';

/**
 * StudentPhotoAvatar - Custom component to display student photos from Google Drive
 * Tries multiple URL formats and falls back to initials if all fail
 */
const StudentPhotoAvatar = ({ photoUrl, name, sx = { width: 50, height: 50 } }) => {
    const [displayUrl, setDisplayUrl] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(!!photoUrl);

    useEffect(() => {
        if (!photoUrl) {
            setLoading(false);
            return;
        }

        const loadImage = async () => {
            const urlsToTry = getImageUrlsToTry(photoUrl);

            if (urlsToTry.length === 0) {
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
    }, [photoUrl]);

    // If image failed to load or no URL provided, show initials
    if (!photoUrl || imageError) {
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

export default StudentPhotoAvatar;
