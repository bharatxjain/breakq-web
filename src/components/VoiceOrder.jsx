import './VoiceOrder.css'

export default function VoiceOrder() {
  return (
    <section className="section voice-order">
      <div className="container voice-order-header">
        <span className="eyebrow">Search in your language</span>
        <h2 className="section-title">Find what you need, in any language</h2>
      </div>
      <div className="container voice-order-inner">
        <p className="vo-text top-left">1 किलो अदरक और 4 किलो गाजर</p>
        <p className="vo-text top-right">3கிலோ உருளைக்கிழங்கு மற்றும் 1கிலோ மிளகாய்</p>

        <div className="vo-orb-wrap">
          <div className="vo-orb" />
          <span className="vo-icon i1">🥛</span>
          <span className="vo-icon i2">💊</span>
          <span className="vo-icon i3">📦</span>
          <span className="vo-icon i4">🔍</span>
          <span className="vo-star">✦</span>
        </div>

        <p className="vo-text bottom-left">3 കിലോ ഉരുളക്കിഴങ്ങും 1 കിലോ മുളകും</p>
        <p className="vo-text bottom-right">2kg onions, 5kg tomato — near me</p>
      </div>
    </section>
  )
}
