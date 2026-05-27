/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for PICKUP HAUL</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>PICKUP HAUL</Text>
          <Text style={tagline}>Hauling & Assembly · Van Nuys, CA</Text>
        </Section>
        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click the button below to choose a new one.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
        </Text>
        <Text style={signature}>— The PICKUP HAUL Team</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const button = {
  backgroundColor: '#F97316', color: '#0A0A12', fontSize: '15px',
  fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px',
  textDecoration: 'none', textTransform: 'uppercase' as const,
  letterSpacing: '0.04em', display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '32px 0 0', lineHeight: '1.5' }
const signature = { fontSize: '13px', color: '#6B7280', margin: '12px 0 0' }
