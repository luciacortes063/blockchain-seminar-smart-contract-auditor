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
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.sol')) onChange(f)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f?.name.endsWith('.sol')) onChange(f)
    e.target.value = ''
  }

  return (
    /* Gradient border wrapper */
    <div className={`grad-border p-px rounded-2xl transition-all duration-300 ${dragging ? 'scale-[1.01]' : ''}`}>
      <div
        className={`relative rounded-2xl bg-bg-surface cursor-pointer transition-all duration-300
          ${dragging ? 'bg-bg-card' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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
              <div className="w-16 h-16 rounded-full bg-bg-card border border-bg-border flex items-center justify-center">
                <FileIcon />
              </div>
              <div>
                <p className="font-display font-semibold text-lg text-slate-100 tracking-wide"
                   style={{ fontFamily: 'var(--font-oxanium)' }}>
                  {file.name}
                </p>
                <p className="text-slate-500 text-sm mt-1 font-mono">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!disabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(null) }}
                  className="text-xs text-slate-500 hover:text-red-400 border border-bg-border hover:border-red-400/30 px-3 py-1 rounded-full transition-colors"
                >
                  Remove
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-bg-card border border-bg-border flex items-center justify-center">
                <UploadIcon />
              </div>
              <div>
                <p className="font-display font-semibold text-lg text-slate-100 tracking-wide"
                   style={{ fontFamily: 'var(--font-oxanium)' }}>
                  Drop your .sol file here
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  or <span className="text-brand-cyan">browse files</span>
                  {' '}·{' '}max 500KB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="url(#upGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="upGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#FF2D7C" />
        </linearGradient>
      </defs>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="url(#fileGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="fileGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#FF2D7C" />
        </linearGradient>
      </defs>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}