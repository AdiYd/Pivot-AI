
import { Timestamp } from 'firebase-admin/firestore'

//
// ── 1. Shared data models ─────────────────────────────────────────────────────
//
export interface Contact {
  name: string
  role: 'Owner' | 'Manager' | 'Shift' | 'Other'
  phone: string
  email?: string
}

export interface PaymentMeta {
  provider: 'Stripe' | 'Paylink'
  customerId: string
  status: 'pending' | 'active'
}

export interface Restaurant {
  id: string
  name: string
  legalId: string
  businessName: string
  yearsActive: number
  createdAt: Timestamp
  isActivated: boolean
  primaryContact: Contact
  payment: PaymentMeta
  settings: {
    timezone: string
    locale: string
  }
}

export type SupplierCategory =
  | 'vegetables' | 'fruits' | 'fish' | 'meat' | 'alcohol'
  | 'oliveOil' | 'disposables' | 'dessert' | 'juices' | 'eggs'
  | string

export interface Supplier {
  id: string
  name: string
  whatsapp: string
  deliveryDays: number[]        // 0=Sun…6=Sat
  cutoffHour: number            // 0–23
  category: SupplierCategory
  rating: number
  createdAt: Timestamp
}

export interface Product {
  id: string
  supplierId: string
  name: string
  emoji: string
  unit: 'kg' | 'gram' | 'liter' | 'pcs' | 'box' | 'bottle' | string
  parMidweek: number
  parWeekend: number
  createdAt: Timestamp
}

export interface ItemLine {
  productId: string
  qty: number
}

export interface ItemShortage extends ItemLine {
  received: number
}

export interface StockLine {
  productId: string
  currentQty: number
}

export interface Order {
  id: string
  supplierId: string
  status: 'pending' | 'sent' | 'delivered'
  items: ItemLine[]
  midweek: boolean
  createdAt: Timestamp
  sentAt?: Timestamp
  receivedAt?: Timestamp
  invoiceUrl?: string
  shortages: ItemShortage[]
}

export interface InventorySnapshot {
  id: string
  supplierId: string
  lines: StockLine[]
  createdAt: Timestamp
}

//
// ── 2. Conversation & Bot types ────────────────────────────────────────────────
//
export type BotState =
  | 'INIT'
  | 'ONBOARDING_COMPANY_NAME'
  | 'ONBOARDING_LEGAL_ID'
  | 'ONBOARDING_RESTAURANT_NAME'
  | 'ONBOARDING_YEARS_ACTIVE'
  | 'ONBOARDING_CONTACT_NAME'
  | 'ONBOARDING_CONTACT_ROLE'
  | 'ONBOARDING_CONTACT_EMAIL'
  | 'ONBOARDING_PAYMENT_METHOD'
  | 'WAITING_FOR_PAYMENT'
  | 'SETUP_SUPPLIERS_START'
  | 'SUPPLIER_DETAILS'
  | 'SUPPLIER_DELIVERY_DAYS'
  | 'SUPPLIER_CUTOFF_TIME'
  | 'SUPPLIER_PRODUCTS'
  | 'PRODUCT_PAR_MIDWEEK'
  | 'PRODUCT_PAR_WEEKEND'
  | 'INVENTORY_START'
  | 'INVENTORY_COUNT'
  | 'INVENTORY_CALCULATE'
  | 'ORDER_INCREASE'
  | 'ORDER_CONFIRMATION'
  | 'DELIVERY_START'
  | 'DELIVERY_CHECK_ITEM'
  | 'DELIVERY_RECEIVED_AMOUNT'
  | 'DELIVERY_INVOICE_PHOTO'
  | 'IDLE'

export interface ConversationState {
  id: string                     // phone as doc-ID
  restaurantId: string
  currentState: BotState
  context: Record<string, any>
  createdAt: Timestamp
  lastMessageTimestamp?: Timestamp
  updatedAt?: Timestamp
}

export interface MessageRecord {
  id?: string
  body: string
  direction: 'incoming' | 'outgoing'
  currentState: BotState | string
  createdAt: Timestamp
}

export interface IncomingMessage {
  from: string            // "whatsapp:0501234567"
  body: string
  mediaUrl?: string
}

export interface BotAction {
  type:
    | 'SEND_MESSAGE'
    | 'CREATE_RESTAURANT'
    | 'UPDATE_SUPPLIER'
    | 'UPDATE_PRODUCT'
    | 'SEND_ORDER'
    | 'LOG_DELIVERY'
  payload: Record<string, any>
}

export interface StateTransition {
  newState: ConversationState
  actions: BotAction[]
}

//
// ── 3. Export everything ─────────────────────────────────────────────────────
export * from './index'  