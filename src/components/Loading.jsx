import './Loading.css';

/**
 * Loading widget — used for route guards, async operations, etc.
 *
 * @param {object} props
 * @param {boolean} [props.fullScreen=false] — center in full viewport
 * @param {string}  [props.message]          — optional loading message
 * @param {string}  [props.size='md']        — 'sm' | 'md' | 'lg'
 */
function Loading({ fullScreen = false, message, size = 'md' }) {
  const wrapperClass = [
    'ld-wrapper',
    fullScreen ? 'ld-fullscreen' : '',
    `ld-size-${size}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass}>
      <div className="ld-ring">
        <svg className="ld-svg" viewBox="0 0 50 50" fill="none">
          {/* Track */}
          <circle cx="25" cy="25" r="20" strokeWidth="4" className="ld-track" />
          {/* Arc */}
          <circle cx="25" cy="25" r="20" strokeWidth="4" className="ld-arc" />
        </svg>
        <span className="ld-dot-wrap" aria-hidden="true">
          <span className="ld-dot" />
          <span className="ld-dot" />
          <span className="ld-dot" />
        </span>
      </div>
      {message && <p className="ld-message">{message}</p>}
    </div>
  );
}

export default Loading;
