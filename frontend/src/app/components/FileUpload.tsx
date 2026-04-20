'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'

interface Props {
  file: File | null
  onChange: (f: File | null) => void
  disabled?: boolean
}

export default function FileUpload({ file, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.sol')) onChange(dropped)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    if (selected?.name.endsWith('.sol')) onChange(selected)
    e.target.value = ''
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
        ${dragging ? 'border-accent bg-accent/5 drop-active' : 'border-bg-border hover:border-accent/50 hover:bg-accent/5'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${file ? 'border-accent/40 bg-accent/5' : ''}
      `}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".sol"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        {file ? (
          <>
            {/* File icon */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/30">
              <SolIcon />
            </div>
            <div>
              <p className="font-display text-accent font-semibold text-lg tracking-wide">
                {file.name}
              </p>
              <p className="text-sm text-slate-500 mt-1 font-mono">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {!disabled && (
              <button
                onClick={handleRemove}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1 border border-bg-border rounded-full hover:border-red-400/30"
              >
                Remove
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-surface border border-bg-border">
              <UploadIcon />
            </div>
            <div>
              <p className="font-display text-slate-200 font-semibold text-lg tracking-wide">
                Drop your .sol file here
              </p>
              <p className="text-sm text-slate-500 mt-1">
                or <span className="text-accent">browse files</span> &nbsp;·&nbsp; max 500 KB
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['ERC-20', 'ERC-721', 'DeFi', 'DAO'].map((tag) => (
                <span key={tag} className="text-xs font-mono text-slate-600 border border-bg-border rounded-full px-2 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function SolIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
