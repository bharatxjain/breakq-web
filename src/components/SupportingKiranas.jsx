import './SupportingKiranas.css'

const tags = [
  { text: 'Books', top: '4%', left: '30%', tone: 'gray' },
  { text: 'LED Bulb', top: '2%', left: '54%', tone: 'green' },
  { text: 'Fresh Atta', top: '16%', left: '68%', tone: 'gray' },
  { text: 'Basmati Rice', top: '20%', left: '10%', tone: 'green' },
  { text: 'Sunflower Oil', top: '40%', left: '68%', tone: 'green' },
  { text: 'Paracetamol', top: '54%', left: '4%', tone: 'gray' },
  { text: 'Chips', top: '58%', left: '72%', tone: 'gray' },
  { text: 'Onions', top: '68%', left: '24%', tone: 'green' },
  { text: 'Toned Milk', top: '64%', left: '58%', tone: 'green' },
  { text: 'Oreo', top: '82%', left: '38%', tone: 'gray' },
]

export default function SupportingKiranas() {
  return (
    <section className="section supporting">
      <div className="container supporting-inner">
        {tags.map((t) => (
          <span
            key={t.text}
            className={`floating-tag tag-${t.tone}`}
            style={{ top: t.top, left: t.left }}
          >
            {t.text}
          </span>
        ))}
        <h2>
          Supporting Local Stores
          <br />
          Empowering Communities
        </h2>
      </div>
    </section>
  )
}
