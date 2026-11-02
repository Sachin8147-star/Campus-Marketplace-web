import { useState } from 'react';

/** Seller's real profile photo when they have one, otherwise their first initial. */
export function SellerAvatar({ name, imageUrl, className = 'mini-avatar' }: { name: string; imageUrl?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return (
      <span className={className}>
        <img src={imageUrl} alt="" onError={() => setFailed(true)} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover', display: 'block' }} />
      </span>
    );
  }
  return <span className={className}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
}
