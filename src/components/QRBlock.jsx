import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Copy, ExternalLink } from 'lucide-react'

export default function QRBlock({ asset }) {
  const canvasWrapRef = useRef(null)
  const publicUrl = `${window.location.origin}/asset/${asset.asset_code}`

  function downloadPng() {
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${asset.asset_code}-label.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl)
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">Public Asset QR</h3>
        <span className="tag-mono text-steel-500">{asset.asset_code}</span>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-tag border border-dashed border-steel-100 bg-steel-50 p-4">
        <div ref={canvasWrapRef}>
          <QRCodeCanvas value={publicUrl} size={144} level="M" includeMargin />
        </div>
        <p className="tag-mono break-all text-center text-steel-500">{publicUrl}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-outline" onClick={downloadPng}>
          <Download size={14} /> Download
        </button>
        <button className="btn-outline" onClick={copyLink}>
          <Copy size={14} /> Copy link
        </button>
        <a className="btn-outline" href={publicUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> Open public page
        </a>
      </div>
    </div>
  )
}
