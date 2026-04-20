'use client'

import { useState } from 'react'
import type { AuditReport } from '@/types/report'
import FileUpload from './components/FileUpload'
import ReportView from './components/ReportView'

type State = 'idle' | 'scanning' | 'done' | 'error'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const SCAN_MESSAGES = [
  'Parsing contract bytecode…',
  'Running LLM semantic analysis…',
  'Executing Slither static analyzer…',
  'Detecting reentrancy patterns…',
  'Checking access control…',
  'Merging and deduplicating findings…',
  'Building vulnerability report…',
]

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<State>('idle')
  const [report, setReport] = useState<AuditReport | null>(null)
  const [error, setError] = useState<string>('')
  const [scanMsgIdx, setScanMsgIdx] = useState(0)

  const handleSubmit = async () => {
    if (!file) return

    setState('scanning')
    setError('')
    setReport(null)

    // Cycle through scan messages while waiting
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % SCAN_MESSAGES.length
      setScanMsgIdx(idx)
    }, 1800)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/api/v1/audit`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(body.detail ?? `Server error: ${res.status}`)
      }

      const data: AuditReport = await res.json()
      setReport(data)
      setState('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setState('error')
    } finally {
      clearInterval(interval)
    }
  }

  const handleReset = () => {
    setFile(null)
    setReport(null)
    setError('')
    setState('idle')
  }

  return (
    <main className="relative z-10 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">

        {/* ── Header ── */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-bg-border bg-bg-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-slow" />
            <span className="font-mono text-xs text-slate-500">LLM + Slither · Powered by Groq</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-slate-100 mb-3"
            style={{ fontFamily: 'var(--font-oxanium)' }}
          >
            Smart Contract<br />
            <span className="text-accent">Auditor</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
            Upload a Solidity file. Get a structured vulnerability report combining
            LLM semantic analysis and Slither static analysis.
          </p>
        </header>

        {/* ── Content ── */}
        {state === 'idle' && (
          <div className="space-y-5 animate-slide-up">
            <FileUpload file={file} onChange={setFile} />
            <button
              onClick={handleSubmit}
              disabled={!file}
              className={`w-full py-4 rounded-xl font-display font-semibold text-sm uppercase tracking-widest transition-all duration-300
                ${file
                  ? 'bg-accent text-bg-base hover:bg-accent/90 shadow-lg shadow-accent/20 hover:shadow-accent/30 cursor-pointer'
                  : 'bg-bg-surface text-slate-600 border border-bg-border cursor-not-allowed'
                }
              `}
            >
              Detect Vulnerabilities
            </button>
          </div>
        )}

        {state === 'scanning' && (
          <ScanningView message={SCAN_MESSAGES[scanMsgIdx]} />
        )}

        {state === 'error' && (
          <div className="animate-slide-up space-y-4">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
              <p className="font-mono text-xs text-red-400 mb-2 uppercase tracking-wider">Error</p>
              <p className="text-slate-300 text-sm">{error}</p>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-bg-border text-slate-400 hover:text-accent hover:border-accent/30 transition-all font-mono text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {state === 'done' && report && (
          <ReportView report={report} onReset={handleReset} />
        )}

      </div>
    </main>
  )
}

/* ── Scanning animation ─────────────────────────────────────────────────── */

function ScanningView({ message }: { message: string }) {
  return (
    <div className="animate-fade-in">
      {/* Scanning card */}
      <div className="relative rounded-xl border border-accent/20 bg-bg-surface overflow-hidden" style={{ height: 260 }}>
        {/* Scan line */}
        <div className="scan-line" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(#38bdf820 1px, transparent 1px), linear-gradient(90deg, #38bdf820 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <ScannerIcon />
          <div className="text-center">
            <p className="font-display text-accent font-semibold tracking-wide mb-1">
              Analyzing contract
            </p>
            <p className="font-mono text-xs text-slate-500 transition-all duration-500">
              {message}
            </p>
          </div>
        </div>

        {/* Corner decorations */}
        <span className="absolute top-3 left-3 w-4 h-4 border-l border-t border-accent/40" />
        <span className="absolute top-3 right-3 w-4 h-4 border-r border-t border-accent/40" />
        <span className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-accent/40" />
        <span className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-accent/40" />
      </div>

      <p className="text-center text-xs font-mono text-slate-600 mt-4">
        This may take 30–60 seconds depending on contract size
      </p>
    </div>
  )
}

function ScannerIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke="#38bdf820" strokeWidth="1" />
      <circle cx="20" cy="20" r="12" stroke="#38bdf830" strokeWidth="1" />
      <circle cx="20" cy="20" r="6" stroke="#38bdf840" strokeWidth="1" />
      <circle cx="20" cy="20" r="2" fill="#38bdf8" />
      <line x1="20" y1="2" x2="20" y2="8" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="3s" repeatCount="indefinite" />
      </line>
      <line x1="20" y1="32" x2="20" y2="38" stroke="#38bdf840" strokeWidth="1" strokeLinecap="round" />
      <line x1="2" y1="20" x2="8" y2="20" stroke="#38bdf840" strokeWidth="1" strokeLinecap="round" />
      <line x1="32" y1="20" x2="38" y2="20" stroke="#38bdf840" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}
