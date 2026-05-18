import { MONTH_SHORT } from './constants.js';

export function fmtDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${MONTH_SHORT[m]} ${parseInt(d, 10)}`;
}

// Mirrors the old imgOrPlaceholder helper: an <img> with an onerror that hides
// itself if the URL is broken, or a tinted div block when there's no URL.
export function ImageOrPlaceholder({ url, className, alt }) {
  if (url) {
    return (
      <img
        className={className}
        src={url}
        alt={alt}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return <div className={className} style={{ background: 'var(--bg)' }} />;
}

export function TagRow({ tags }) {
  if (!tags || !tags.length) return null;
  return (
    <div className="tag-row">
      {tags.map((t, i) => <span key={`${t}-${i}`} className="tag">{t}</span>)}
    </div>
  );
}
