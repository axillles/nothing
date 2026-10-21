export interface ReceiptTheme {
  id: string
  name: string
  /** Solid colour behind the text; the art fades into it. */
  base: string
  text: string
  muted: string
  accent: string
}

// Art lives in /public/receipt-art/<id>.svg (original, generated for this project).
export const RECEIPT_THEMES: ReceiptTheme[] = [
  { id: 'void', name: 'Void', base: '#0b0905', text: '#f5f1e8', muted: '#8a8170', accent: '#e8c25a' },
  { id: 'aurora', name: 'Aurora', base: '#05060d', text: '#f5f1e8', muted: '#8b8fa8', accent: '#b69cff' },
  { id: 'matrix', name: 'Matrix', base: '#020a04', text: '#d9ffe6', muted: '#4f8a63', accent: '#00ff66' },
  { id: 'sunset', name: 'Sunset', base: '#1a0b2e', text: '#fff1e6', muted: '#b48aa8', accent: '#ffb35c' },
  { id: 'diamond', name: 'Diamond', base: '#070707', text: '#f5f1e8', muted: '#7d7d7d', accent: '#f3d77a' },
  { id: 'paper', name: 'Paper', base: '#f2ecdf', text: '#141414', muted: '#7a7264', accent: '#9a7a12' },
]

export const RECEIPT_CAPTIONS = [
  'PAID FOR NOTHING',
  'I OWN NOTHING',
  'NO REFUNDS. NO REGRETS.',
  'PROOF OF NOTHING',
  'FINANCIALLY IRRESPONSIBLE',
]

export interface ReceiptOptions {
  theme: ReceiptTheme
  caption: string
  showName: boolean
  showCrypto: boolean
}

/** Parses share-link query params (?theme=&caption=&name=&crypto=) with safe defaults. */
export function parseReceiptOptions(params: Record<string, string | string[] | undefined> | URLSearchParams): ReceiptOptions {
  const get = (key: string) => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key]
    return Array.isArray(value) ? value[0] : value ?? undefined
  }
  const theme = RECEIPT_THEMES.find((item) => item.id === get('theme')) ?? RECEIPT_THEMES[0]
  const captionIndex = Number(get('caption'))
  return {
    theme,
    caption: RECEIPT_CAPTIONS[Number.isInteger(captionIndex) && captionIndex >= 0 && captionIndex < RECEIPT_CAPTIONS.length ? captionIndex : 0],
    showName: get('name') !== '0',
    showCrypto: get('crypto') !== '0',
  }
}

export function receiptQuery(options: ReceiptOptions) {
  const params = new URLSearchParams({ theme: options.theme.id, caption: String(RECEIPT_CAPTIONS.indexOf(options.caption)) })
  if (!options.showName) params.set('name', '0')
  if (!options.showCrypto) params.set('crypto', '0')
  return params.toString()
}
