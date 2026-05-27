/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

type TemplateData = Record<string, unknown>

export interface TemplateEntry {
  component: React.ComponentType<unknown>
  subject: string | ((data: TemplateData) => string)
  to?: string
  displayName?: string
  previewData?: TemplateData
}

import { template as estimateConfirmation } from './estimate-confirmation.tsx'
import { template as estimateInternal } from './estimate-internal.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as bookingInternal } from './booking-internal.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'estimate-confirmation': estimateConfirmation,
  'estimate-internal': estimateInternal,
  'booking-confirmation': bookingConfirmation,
  'booking-internal': bookingInternal,
  'payment-receipt': paymentReceipt,
}
