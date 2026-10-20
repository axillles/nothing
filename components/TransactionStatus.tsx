export function TransactionStatus({ status, message }: { status: string; message?: string }) {
  const good = ['verified', 'confirmed', 'minted'].includes(status)
  return (
    <div className={`rounded-[3px] border p-4 font-mono text-xs ${good ? 'border-[#163c26] bg-[#07130c] text-[var(--green)]' : 'border-[var(--line)] bg-[#0d0d0d] text-[#999]'}`}>
      <div className="tracking-[0.18em]">{status.toUpperCase()}</div>
      {message && <div className="mt-2 font-sans text-sm leading-6 text-[#aaa]">{message}</div>}
    </div>
  )
}
