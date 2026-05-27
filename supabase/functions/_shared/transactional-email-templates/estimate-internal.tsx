/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'

const ADMIN_BASE_URL = 'https://www.autobais.app/admin'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  phone?: string
  serviceType?: string
  serviceDirection?: string
  stops?: string[]
  distanceMiles?: number
  preferredDate?: string
  preferredTime?: string
  itemQuantity?: number
  itemWeightLbs?: number
  itemDimensions?: string
  notes?: string
  requestId?: string
}

const Email = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New estimate request — {p.serviceType ?? 'hauling'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New Estimate Request</Heading>
        <Text style={text}>A new request just came in from the website.</Text>

        <Hr style={hr} />
        {p.name && <Row label="Name"  value={p.name} />}
        {p.email && <Row label="Email" value={p.email} />}
        {p.phone && <Row label="Phone" value={p.phone} />}
        {p.serviceType && <Row label="Service" value={p.serviceType} />}
        {p.serviceDirection && <Row label="Direction" value={p.serviceDirection} />}
        {p.stops && p.stops.length > 0 && (
          <Row label="Route" value={p.stops.join('  →  ')} />
        )}
        {typeof p.distanceMiles === 'number' && (
          <Row label="Distance" value={`${p.distanceMiles} mi`} />
        )}
        {p.preferredDate && <Row label="Preferred date" value={p.preferredDate} />}
        {p.preferredTime && <Row label="Preferred time" value={p.preferredTime} />}
        {typeof p.itemQuantity === 'number' && (
          <Row label="Quantity" value={String(p.itemQuantity)} />
        )}
        {typeof p.itemWeightLbs === 'number' && p.itemWeightLbs > 0 && (
          <Row label="Weight" value={`${p.itemWeightLbs} lbs`} />
        )}
        {p.itemDimensions && <Row label="Dimensions" value={p.itemDimensions} />}
        {p.notes && <Row label="Notes" value={p.notes} />}
        {p.requestId && <Row label="Request ID" value={p.requestId} />}
        {p.requestId && (
          <Section style={{ marginTop: '24px' }}>
            <Button
              href={`${ADMIN_BASE_URL}?tab=estimates&request_id=${p.requestId}`}
              style={button}
            >
              Open in admin panel
            </Button>
          </Section>
        )}
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
  subject: 'New AutoBais Quote Request',
  displayName: 'Estimate request (internal)',
  to: 'support@autobais.app',
  previewData: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '(555) 123-4567',
    serviceType: 'Moving',
    serviceDirection: 'both',
    stops: ['123 Main St, Los Angeles', '456 Oak Ave, Burbank'],
    distanceMiles: 14,
    itemQuantity: 3,
    requestId: 'abc-123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: 0 }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#111111', margin: '0 0 12px', fontFamily: 'Oswald, Arial, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.02em' }
const text = { fontSize: '14px', color: '#333333', lineHeight: 1.6, margin: '0 0 16px' }
const rowLabel = { fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#888888', margin: 0, fontWeight: 500 }
const rowValue = { fontSize: '14px', color: '#111111', margin: '2px 0 0', fontWeight: 500 }
const hr = { borderColor: '#eaeaea', margin: '20px 0' }
const button = { backgroundColor: '#F97316', color: '#ffffff', padding: '12px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: 'Oswald, Arial, sans-serif' }
