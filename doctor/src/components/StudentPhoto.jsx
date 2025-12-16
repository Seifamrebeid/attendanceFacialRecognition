import { useState, useEffect } from "react";

const StudentPhoto = ({ photoUrl, name }) => {
  const [displayUrl, setDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);

    const checkImages = async () => {
      // Generate URLs to try
      const urls = [];

      // 1. Try local files by name
      if (name) {
        const encodedName = encodeURIComponent(name);
        const nameWithUnderscores = name.replace(/\s+/g, '_');
        // Try various extensions and formats
        urls.push(`/student_photos/${name}.jpg`);
        urls.push(`/student_photos/${name}.png`);
        urls.push(`/student_photos/${name}.jpeg`);
        if (name !== encodedName) urls.push(`/student_photos/${encodedName}.jpg`);
        if (name !== nameWithUnderscores) urls.push(`/student_photos/${nameWithUnderscores}.jpg`);
      }

      // 2. Try Google Drive/Remote URLs
      if (photoUrl) {
        const match = photoUrl.match(/id=([a-zA-Z0-9_-]+)/) || photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          const fileId = match[1];
          urls.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w200`);
          urls.push(`https://drive.google.com/uc?export=view&id=${fileId}`);
        } else {
          urls.push(photoUrl);
        }
      }

      // Helper to test if an image exists
      const testUrl = (url) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
      };

      // Find the first working URL
      for (const url of urls) {
        if (!mounted) return;
        const exists = await testUrl(url);
        if (exists) {
          if (mounted) {
            setDisplayUrl(url);
            setLoading(false);
          }
          return;
        }
      }

      // If we get here, no URLs worked
      if (mounted) {
        setError(true);
        setLoading(false);
      }
    };

    checkImages();

    return () => {
      mounted = false;
    };
  }, [photoUrl, name]);

  if (loading || error || !displayUrl) {
    return (
      <div className="photo-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {name ? name.charAt(0).toUpperCase() : '?'}
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={name}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      referrerPolicy="no-referrer"
    />
  );
};

export default StudentPhoto;
