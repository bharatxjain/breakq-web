import './FloatingQR.css'

export default function FloatingQR() {
  return (
    <div className="floating-qr">
      <img src="/Breakq_QR.png" alt="Scan to download BreakQ" className="qr-image" />
      <div className="floating-qr-text">
        <small>download</small>
        <strong>BreakQ</strong>
      </div>
    </div>
  )
}
