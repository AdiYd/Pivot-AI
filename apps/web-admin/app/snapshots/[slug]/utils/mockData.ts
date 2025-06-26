// Mock JWT data for testing
export const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXN0YXVyYW50SWQiOiIxMjM0NTY3ODkiLCJjb250YWN0Ijp7Im5hbWUiOiJJc3JhZWwgSXNyYWVsaSIsIndoYXRzYXBwIjoiMDUyMTIzNDU2NyIsInJvbGUiOiJvd25lciJ9LCJvcmRlcklkIjoib3JkZXItMTIzNDUifQ.SFK4LTgk-vADnJTGXVQ85VUb8gnnjnYSxl_m994uLho';

// Decoded JWT payload
export const mockJwtPayload = {
  restaurantId: '123456789',
  contact: {
    name: 'Israel Israeli',
    whatsapp: '052123456',
    role: 'owner'
  },
  orderId: 'order-12345'
};

// Mock restaurant data
export const mockRestaurant = {
  legalId: '123456789',
  legalName: 'מסעדת טעמים בע"מ',
  name: 'מסעדת טעמים',
  contacts: {
    '052123456': {
      name: 'Israel Israeli',
      whatsapp: '052123456',
      role: 'owner'
    }
  },
  payment: {
    provider: 'credit_card',
    status: true
  },
  isActivated: true,
  suppliers: [
    {
      name: 'ספק ירקות ופירות',
      whatsapp: '0501234567',
      role: 'supplier',
      email: 'produce@example.com',
      category: ['vegetables', 'fruits'],
      reminders: [
        { day: 'sun', time: '10:00' },
        { day: 'wed', time: '10:00' }
      ],
      rating: 4.5,
      products: [
        {
          name: 'עגבניה',
          unit: 'kg',
          emoji: '🍅',
          parMidweek: 10,
          parWeekend: 15
        },
        {
          name: 'מלפפון',
          unit: 'kg',
          emoji: '🥒',
          parMidweek: 8,
          parWeekend: 12
        },
        {
          name: 'תפוז',
          unit: 'kg',
          emoji: '🍊',
          parMidweek: 5,
          parWeekend: 8
        }
      ]
    },
    {
      name: 'ספק בשר',
      whatsapp: '0502345678',
      role: 'supplier',
      category: ['meats'],
      reminders: [
        { day: 'mon', time: '12:00' }
      ],
      rating: 5,
      products: [
        {
          name: 'אנטריקוט',
          unit: 'kg',
          emoji: '🥩',
          parMidweek: 4,
          parWeekend: 7
        },
        {
          name: 'חזה עוף',
          unit: 'kg',
          emoji: '🍗',
          parMidweek: 6,
          parWeekend: 10
        }
      ]
    }
  ]
};
