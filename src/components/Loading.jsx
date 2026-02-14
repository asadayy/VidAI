import './Loading.css';

/**
 * Loading spinner — used for route guards, async operations, etc.
 *
 * @param {object} props
 * @param {boolean} [props.fullScreen=false] — center spinner in full viewport
 * @param {string} [props.message] — optional loading message
 * @param {string} [props.size='md'] — 'sm' | 'md' | 'lg'
 */
function Loading({ fullScreen = false, message, size = 'md' }) {
  const wrapperClass = fullScreen ? 'loading-wrapper loading-fullscreen' : 'loading-wrapper';

  return (
    <div className={wrapperClass}>
      <div className={`loading-spinner loading-${size}`} />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default Loading;
