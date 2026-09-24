import PageHeader from '../components/PageHeader'
import ContactSection from '../components/ContactSection'
import { useSeo } from '../lib/seo'

export default function Contact() {
  useSeo({
    title: 'Contact Us',
    description:
      'Questions about becoming a BreakQ partner store, using the app, or anything else? Get in touch and our team will help.',
    path: '/contact',
  })

  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Contact us"
        subtitle="Questions about becoming a partner store, using the app, or anything else? Our team is here to help."
      />
      <ContactSection />
    </>
  )
}
