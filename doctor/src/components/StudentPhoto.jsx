import { useState } from "react";

const StudentPhoto = ({ photoUrl, name }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!photoUrl || imageError) {
    return (
      <div className="photo-placeholder">{name.charAt(0).toUpperCase()}</div>
    );
  }

  // Use CORS proxy or direct thumbnail URL
  const getThumbnailUrl = (url) => {
    // Extract Google Drive ID
    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) {
      const fileId = match[1];
      // Use Google Drive thumbnail API which works better for embedding
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
    }
    return url;
  };

  const thumbnailUrl = getThumbnailUrl(photoUrl);

  return (
    <>
      {loading && (
        <div className="photo-placeholder">{name.charAt(0).toUpperCase()}</div>
      )}
      <img
        src={thumbnailUrl}
        alt={name}
        onLoad={() => setLoading(false)}
        onError={() => {
          setImageError(true);
          setLoading(false);
        }}
        style={{ display: loading ? "none" : "block" }}
        referrerPolicy="no-referrer"
      />
    </>
  );
};

export default StudentPhoto;
