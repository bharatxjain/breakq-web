import './FloatingQR.css'

export default function FloatingQR() {
  return (
    <div className="floating-qr">
      <img
        src="/qr-code.png"
        alt="Scan to download BreakQ"
        className="qr-image"
        width="84"
        height="84"
        loading="lazy"
      />
      <div className="floating-qr-text">
        <small>download</small>
        <strong>BreakQ</strong>
      </div>
    </div>
  )
}
