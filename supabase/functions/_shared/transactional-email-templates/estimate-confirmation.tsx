/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AutoBais — Pickup Haul'

interface Props {
  name?: string
  serviceType?: string
  stops?: string[]
  distanceMiles?: number
  preferredDate?: string
  preferredTime?: string
  itemQuantity?: number
  itemWeightLbs?: number
  itemDimensions?: string
  notes?: string
  phone?: string
}

const Email = ({
  name, serviceType, stops, distanceMiles, preferredDate, preferredTime,
  itemQuantity, itemWeightLbs, itemDimensions, notes, phone,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your request — we'll be in touch shortly</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Thank you for your request, ${name}` : 'Thank you for your request'}
        </Heading>
        <Text style={text}>
          We've received your hauling request and will contact you with a confirmed
          estimate shortly. If it's urgent, call us at{' '}
          <a href="tel:+17473706885" style={link}>(747) 370-6885</a>.
        </Text>

        <Hr style={hr} />
        <Text style={label}>Your request</Text>

        {serviceType && <Row label="Service" value={serviceType} />}
        {stops && stops.length > 0 && (
          <Row label="Route" value={stops.join('  →  ')} />
        )}
        {typeof distanceMiles === 'number' && (
          <Row label="Distance" value={`${distanceMiles} mi`} />
        )}
        {preferredDate && <Row label="Preferred date" value={preferredDate} />}
        {preferredTime && <Row label="Preferred time" value={preferredTime} />}
        {typeof itemQuantity === 'number' && (
          <Row label="Quantity" value={String(itemQuantity)} />
        )}
        {typeof itemWeightLbs === 'number' && itemWeightLbs > 0 && (
          <Row label="Weight" value={`${itemWeightLbs} lbs`} />
        )}
        {itemDimensions && <Row label="Dimensions" value={itemDimensions} />}
        {phone && <Row label="Your phone" value={phone} />}
        {notes && <Row label="Notes" value={notes} />}

        <Hr style={hr} />
        <Text style={small}>
          AutoBais LLC · Van Nuys, CA · Insured $1M / $2M general liability
        </Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Section style={{ marginBottom: '8px' }}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value}</Text>
  </Section>
)

export const template = {
  component: Email,
  subject: 'AutoBais — Request Received',
  displayName: 'Estimate confirmation (customer)',
  previewData: {
    name: 'Alex',
    serviceType: 'Moving',
    stops: ['123 Main St, Los Angeles', '456 Oak Ave, Burbank'],
    distanceMiles: 14,
    preferredDate: '2026-05-04',
    preferredTime: '9–11 AM',
    itemQuantity: 3,
    itemWeightLbs: 250,
    phone: '(555) 123-4567',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: 0 }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#111111', margin: '0 0 16px', fontFamily: 'Oswald, Arial, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.02em' }
const text = { fontSize: '15px', color: '#333333', lineHeight: 1.6, margin: '0 0 20px' }
const label = { fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#888888', margin: '0 0 12px', fontWeight: 500 }
const rowLabel = { fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#888888', margin: 0, fontWeight: 500 }
const rowValue = { fontSize: '14px', color: '#111111', margin: '2px 0 0', fontWeight: 500 }
const hr = { borderColor: '#eaeaea', margin: '24px 0' }
const small = { fontSize: '12px', color: '#888888', margin: '0 0 8px', lineHeight: 1.5 }
const footer = { fontSize: '13px', color: '#555555', margin: '20px 0 0' }
const link = { color: '#F97316', textDecoration: 'none', fontWeight: 600 }
