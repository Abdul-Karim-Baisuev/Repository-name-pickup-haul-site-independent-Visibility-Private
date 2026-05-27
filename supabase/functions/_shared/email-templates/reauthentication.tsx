/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>PICKUP HAUL</Text>
          <Text style={tagline}>Hauling & Assembly · Van Nuys, CA</Text>
        </Section>
        <Heading style={h1}>Confirm Reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
        <Text style={signature}>— The PICKUP HAUL Team</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { borderBottom: '2px solid #F97316', paddingBottom: '14px', marginBottom: '28px' }
const brand = {
  fontFamily: 'Oswald, Impact, Arial Black, sans-serif',
  fontSize: '26px', fontWeight: 'bold' as const, color: '#0A0A12',
  letterSpacing: '0.04em', margin: '0', textTransform: 'uppercase' as const,
}
const tagline = {
  fontSize: '12px', color: '#6B7280', margin: '4px 0 0',
  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
}
const h1 = {
  fontFamily: 'Oswald, Impact, Arial Black, sans-serif',
  fontSize: '24px', fontWeight: 'bold' as const, color: '#0A0A12',
  margin: '0 0 18px', letterSpacing: '0.02em', textTransform: 'uppercase' as const,
}
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 18px' }
const codeBox = {
  backgroundColor: '#FFF7ED',
  border: '2px solid #F97316',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: 'Courier New, Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#0A0A12',
  letterSpacing: '0.2em',
  margin: '0',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '32px 0 0', lineHeight: '1.5' }
const signature = { fontSize: '13px', color: '#6B7280', margin: '12px 0 0' }
