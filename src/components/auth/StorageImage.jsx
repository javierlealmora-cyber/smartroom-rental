// src/components/auth/StorageImage.jsx
// Loads an image from Supabase Storage bucket 'Assets-SmartRent'.
// Falls back to a CSS gradient if the image fails to load.
import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

const BUCKET = "Assets-SmartRent";

export default function StorageImage({
  storageKey,
  fallbackGradient = "linear-gradient(135deg, #1e3a5f, #111827)",
  style = {},
  children,
}) {
  const [bgUrl, setBgUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setFailed(true);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
    if (data?.publicUrl) {
      // Preload image to detect 404
      const img = new Image();
      img.onload = () => setBgUrl(data.publicUrl);
      img.onerror = () => setFailed(true);
      img.src = data.publicUrl;
    } else {
      setFailed(true);
    }
  }, [storageKey]);

  const background = failed || !bgUrl ? fallbackGradient : `url(${bgUrl})`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: background,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
