/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AutoBais — Pickup Haul'

interface LineItem {
  name: string
  quantity?: number
  amount_total: number // cents
}

interface Props {
  name?: string
  receiptId?: string
  currency?: string
  amount_total?: number
  total_discount?: number
  line_items?: LineItem[]
  customer_email?: string
  customer_phone?: string
  paid_at?: string
}

const formatCents = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100)

const Email = ({
  name,
  receiptId,
  currency = 'USD',
  amount_total = 0,
  total_discount = 0,
  line_items = [],
  customer_email,
  customer_phone,
  paid_at,
}: Props) => {
  const mainItem = line_items.find((li) => !li.name.toLowerCase().startsWith('add-on:'))
  const addOns = line_items.filter((li) => li.name.toLowerCase().startsWith('add-on:'))

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your AutoBais receipt — payment confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>AutoBais</Text>
          <Heading style={h1}>
            {name ? `Thank you, ${name}` : 'Thank you for your payment'}
          </Heading>
          <Text style={text}>
            Your payment has been received. Below is a copy of your receipt for your records.
            We'll reach out shortly to confirm the schedule. For anything urgent, call{' '}
            <a href="tel:+17473706885" style={link}>(747) 370-6885</a>.
          </Text>

          <Hr style={hr} />
          <Text style={sectionLabel}>Receipt</Text>

          {mainItem && (
            <Section style={mainRow}>
              <Text style={mainName}>{mainItem.name}</Text>
              {mainItem.quantity && mainItem.quantity > 1 && (
                <Text style={qty}>Qty {mainItem.quantity}</Text>
              )}
              <Text style={mainAmount}>{formatCents(mainItem.amount_total, currency)}</Text>
            </Section>
          )}

          {addOns.length > 0 && (
            <Section style={{ marginTop: '12px' }}>
              <Text style={subLabel}>Add-ons</Text>
              {addOns.map((li, i) => (
                <Section key={i} style={lineRow}>
                  <Text style={lineName}>{li.name.replace(/^add-on:\s*/i, '')}</Text>
                  <Text style={lineAmount}>+{formatCents(li.amount_total, currency)}</Text>
                </Section>
              ))}
            </Section>
          )}

          {total_discount > 0 && (
            <>
              <Hr style={hrLight} />
              <Section style={lineRow}>
                <Text style={lineName}>Promo discount</Text>
                <Text style={discountAmount}>−{formatCents(total_discount, currency)}</Text>
              </Section>
            </>
          )}

          <Hr style={hr} />
          <Section style={totalRow}>
            <Text style={totalLabel}>Total paid</Text>
            <Text style={totalAmount}>{formatCents(amount_total, currency)}</Text>
          </Section>

          <Hr style={hr} />
          <Text style={sectionLabel}>Billed to</Text>
          {name && <Text style={infoLine}>{name}</Text>}
          {customer_email && <Text style={infoLine}>{customer_email}</Text>}
          {customer_phone && <Text style={infoLine}>{customer_phone}</Text>}
          {paid_at && <Text style={infoMuted}>Paid on {paid_at}</Text>}
          {receiptId && <Text style={refLine}>Reference: {receiptId}</Text>}

          <Hr style={hr} />
          <Text style={small}>
            AutoBais LLC · Van Nuys, CA 91405 · Insured $1M / $2M general liability
          </Text>
          <Text style={footer}>— The {SITE_NAME} team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Your AutoBais receipt',
  displayName: 'Payment receipt (customer)',
  previewData: {
    name: 'Alex',
    receiptId: 'cs_test_a1b2c3d4e5',
    currency: 'USD',
    amount_total: 22900,
    total_discount: 2000,
    line_items: [
      { name: 'Office Setup', quantity: 1, amount_total: 19900 },
      { name: 'Add-on: Heavy item (>75 lb)', quantity: 1, amount_total: 5000 },
    ],
    customer_email: 'alex@example.com',
    customer_phone: '(555) 123-4567',
    paid_at: 'April 30, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: 0 }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '12px', letterSpacing: '0.3em', color: '#F97316', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' as const, fontFamily: 'Oswald, Arial, sans-serif' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#111111', margin: '0 0 16px', fontFamily: 'Oswald, Arial, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.02em' }
const text = { fontSize: '15px', color: '#333333', lineHeight: 1.6, margin: '0 0 20px' }
const sectionLabel = { fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#888888', margin: '0 0 12px', fontWeight: 600 }
const subLabel = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#aaaaaa', margin: '0 0 6px', fontWeight: 500 }
const mainRow = { margin: '0 0 4px' }
const mainName = { fontSize: '15px', fontWeight: 600, color: '#111111', margin: 0, display: 'inline-block' as const }
const mainAmount = { fontSize: '15px', fontWeight: 600, color: '#111111', margin: '4px 0 0', textAlign: 'right' as const }
const qty = { fontSize: '12px', color: '#888888', margin: '2px 0 0' }
const lineRow = { margin: '4px 0' }
const lineName = { fontSize: '13px', color: '#444444', margin: 0, display: 'inline-block' as const }
const lineAmount = { fontSize: '13px', color: '#F97316', fontWeight: 600, margin: '2px 0 0', textAlign: 'right' as const }
const discountAmount = { fontSize: '13px', color: '#F97316', fontWeight: 600, margin: '2px 0 0', textAlign: 'right' as const }
const totalRow = { margin: '8px 0' }
const totalLabel = { fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#666666', fontWeight: 600, margin: 0 }
const totalAmount = { fontSize: '24px', fontWeight: 700, color: '#F97316', margin: '6px 0 0', textAlign: 'right' as const, fontFamily: 'Oswald, Arial, sans-serif' }
const infoLine = { fontSize: '14px', color: '#333333', margin: '0 0 2px' }
const infoMuted = { fontSize: '12px', color: '#888888', margin: '8px 0 0' }
const refLine = { fontSize: '11px', color: '#999999', margin: '6px 0 0', fontFamily: 'monospace' }
const hr = { borderColor: '#eaeaea', margin: '24px 0' }
const hrLight = { borderColor: '#f3f3f3', margin: '12px 0' }
const small = { fontSize: '12px', color: '#888888', margin: '0 0 8px', lineHeight: 1.5 }
const footer = { fontSize: '13px', color: '#555555', margin: '20px 0 0' }
const link = { color: '#F97316', textDecoration: 'none', fontWeight: 600 }
