import './PhoneFrame.css'

export default function PhoneFrame({ children, className = '' }) {
  return (
    <div className={`phone-frame ${className}`}>
      <div className="phone-notch" />
      <div className="phone-screen">{children}</div>
    </div>
  )
}
