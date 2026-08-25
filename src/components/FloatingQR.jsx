import './FloatingQR.css'

function QRPattern() {
  const cells = []
  for (let i = 0; i < 49; i++) {
    const on = Math.random() > 0.5
    cells.push(<div key={i} className={on ? 'qr-cell on' : 'qr-cell'} />)
  }
  return <div className="qr-grid">{cells}</div>
}

export default function FloatingQR() {
  return (
    <div className="floating-qr">
      <QRPattern />
      <div className="floating-qr-text">
        <small>download</small>
        <strong>BreakQ</strong>
      </div>
    </div>
  )
}
