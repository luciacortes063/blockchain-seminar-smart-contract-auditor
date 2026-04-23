'use client'

import { useState } from 'react'
import type { AuditReport, Severity, Vulnerability } from '@/types/report'

/* ── Severity config ──────────────────────────────────────────────────────── */

const SEV: Record<Severity, {
  label: string; color: string; bg: string; border: string; leftBar: string; badge: string
}> = {
  CRITICAL: {
    label: 'CRITICAL', color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)',
    leftBar: '#EF4444', badge: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  HIGH: {
    label: 'HIGH', color: '#F97316',
    bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)',
    leftBar: '#F97316', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  },
  MEDIUM: {
    label: 'MEDIUM', color: '#EAB308',
    bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)',
    leftBar: '#EAB308', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
  LOW: {
    label: 'LOW', color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)',
    leftBar: '#3B82F6', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  INFO: {
    label: 'INFO', color: '#6B7280',
    bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)',
    leftBar: '#6B7280', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
}

const CONF_PCT: Record<string, number> = { HIGH: 95, MEDIUM: 70, LOW: 40 }

const SIDEBAR_PAGE = 7

/* ── Main component ───────────────────────────────────────────────────────── */

interface Props { report: AuditReport; onReset: () => void }

export default function ReportView({ report, onReset }: Props) {
  const { meta, overall_risk, summary, contract_info, statistics, vulnerabilities } = report
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const sev = SEV[overall_risk] ?? SEV.INFO
  const selected = vulnerabilities[selectedIdx] ?? null
  const visible = showAll ? vulnerabilities : vulnerabilities.slice(0, SIDEBAR_PAGE)
  const hidden = vulnerabilities.length - SIDEBAR_PAGE

  return (
    <div className="relative z-10 min-h-screen flex flex-col animate-fade-in">

      {/* ══ TOP HEADER ══════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 px-6 pt-6 pb-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: title + contract info */}
          <div>
            <h1 className="font-display text-3xl font-bold grad-text mb-3"
                style={{ fontFamily: 'var(--font-oxanium)' }}>
              Smart Contract Auditor
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-bg-card border border-bg-border rounded-xl px-3 py-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="#9B4DFF" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-slate-200 text-sm font-medium">{meta.contract_name}</span>
              </div>
              {contract_info?.solidity_version && (
                <span className="text-slate-500 text-xs font-mono">
                  Solidity: {contract_info.solidity_version}
                </span>
              )}
              {contract_info?.total_lines > 0 && (
                <span className="text-slate-500 text-xs font-mono">
                  Lines: {contract_info.total_lines}
                </span>
              )}
              <span className="text-xs font-medium" style={{ color: '#4ADE80' }}>
                ✓ Analysis completed
              </span>
            </div>
          </div>

          {/* Right: analysis engine box */}
          <div className="bg-bg-card border border-bg-border rounded-xl p-3 min-w-[160px]">
            <p className="text-slate-500 text-xs mb-2 font-mono uppercase tracking-wider">Analysis Engine</p>
            <div className="space-y-1.5">
              <EngineRow
                icon={<AIIcon />}
                label="GenAI Semantic"
                active={!!report.raw?.llm}
              />
              <EngineRow
                icon={<SlitherIcon />}
                label="Slither Static"
                active={meta.slither_available}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ══ STATS BAR ═══════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 px-6 pb-4">
        <p className="text-slate-400 text-xs uppercase tracking-widest font-mono mb-3">Vulnerabilities</p>
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="CRITICAL" count={statistics.critical} sev="CRITICAL" />
          <StatCard label="HIGH"     count={statistics.high}     sev="HIGH" />
          <StatCard label="MEDIUM"   count={statistics.medium}   sev="MEDIUM" />
          <StatCard label="LOW"      count={statistics.low}      sev="LOW" />
          <TotalCard count={statistics.total} />
        </div>
      </div>

      {/* ══ TWO-COLUMN MAIN ═════════════════════════════════════════════════ */}
      <div className="flex flex-1 gap-0 px-6 pb-6 min-h-0" style={{ height: 'calc(100vh - 260px)' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="flex flex-col w-72 flex-shrink-0 bg-bg-card border border-bg-border rounded-l-2xl overflow-hidden">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-bg-border flex-shrink-0">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-mono">Security Analysis</p>
            <p className="text-slate-500 text-xs mt-0.5">Vulnerabilities ({vulnerabilities.length})</p>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {visible.map((v, i) => (
              <SidebarItem
                key={v.id}
                vuln={v}
                selected={selectedIdx === i}
                onClick={() => setSelectedIdx(i)}
              />
            ))}

            {/* Show more */}
            {!showAll && hidden > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full py-3 px-4 text-xs text-brand-cyan hover:text-brand-purple transition-colors font-mono border-t border-bg-border"
              >
                Show {hidden} more ↓
              </button>
            )}
          </div>
        </aside>

        {/* ── RIGHT DETAIL PANEL ───────────────────────────────────────── */}
        <div className="flex-1 bg-bg-surface border border-l-0 border-bg-border rounded-r-2xl overflow-y-auto">
          {selected
            ? <VulnDetail vuln={selected} contractCode={report.raw?.llm ? undefined : undefined} />
            : (
              <div className="flex items-center justify-center h-full text-slate-600 font-mono text-sm">
                Select a vulnerability
              </div>
            )
          }
        </div>
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 px-6 pb-6 flex justify-between items-center">
        <button
          onClick={onReset}
          className="text-xs font-mono text-slate-500 hover:text-brand-cyan transition-colors border border-bg-border hover:border-brand-cyan/30 px-4 py-2 rounded-xl"
        >
          ← New Audit
        </button>
        <p className="text-xs text-slate-600 font-mono">
          {meta.llm_model} · {new Date(meta.audit_timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
    </div>
  )
}

/* ── Sidebar item ─────────────────────────────────────────────────────────── */

function SidebarItem({ vuln, selected, onClick }: {
  vuln: Vulnerability; selected: boolean; onClick: () => void
}) {
  const s = SEV[vuln.severity] ?? SEV.INFO
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-bg-border transition-all duration-150 relative
        ${selected ? 'bg-bg-surface' : 'hover:bg-bg-surface/50'}`}
    >
      {/* Left color bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5"
           style={{ background: s.leftBar }} />

      <p className={`text-sm font-medium leading-snug mb-1.5
        ${selected ? 'text-slate-100' : 'text-slate-300'}`}>
        {vuln.title}
      </p>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${s.badge}`}>
          {s.label}
        </span>
        {vuln.swc_id && (
          <span className="text-xs text-slate-600 font-mono">{vuln.swc_id}</span>
        )}
      </div>
    </button>
  )
}

/* ── Vulnerability detail ─────────────────────────────────────────────────── */

function VulnDetail({ vuln }: { vuln: Vulnerability }) {
  const s = SEV[vuln.severity] ?? SEV.INFO
  const confPct = CONF_PCT[vuln.confidence] ?? 70

  return (
    <div className="p-6 space-y-5">
      {/* Severity badge + title */}
      <div>
        <span className={`inline-block text-xs font-mono font-bold px-2.5 py-1 rounded border mb-3 ${s.badge}
          ${vuln.severity === 'CRITICAL' ? 'animate-crit' : ''}`}>
          {s.label}
        </span>
        <h2 className="font-display text-2xl font-bold text-slate-100 leading-tight"
            style={{ fontFamily: 'var(--font-oxanium)' }}>
          {vuln.title}
        </h2>
        {vuln.description && (
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">{vuln.description}</p>
        )}
      </div>

      {/* IMPACT */}
      {vuln.exploitation_scenario && (
        <Section title="IMPACT" titleColor={s.color}>
          <div className="rounded-xl p-4 flex gap-3 items-start"
               style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <span className="mt-0.5 flex-shrink-0">
              <WarningIcon color={s.color} />
            </span>
            <p className="text-slate-300 text-sm leading-relaxed">{vuln.exploitation_scenario}</p>
          </div>
        </Section>
      )}

      {/* LOCATION */}
      {(vuln.affected_code_snippet || vuln.line_numbers?.length > 0) && (
        <Section title="LOCATION" titleColor="#9B4DFF">
          <CodeBlock snippet={vuln.affected_code_snippet} lineNumbers={vuln.line_numbers} />
        </Section>
      )}

      {/* RECOMMENDATION */}
      {vuln.recommendation && (
        <Section title="RECOMMENDATION" titleColor="#4ADE80">
          <div className="rounded-xl p-4 flex gap-3 items-start"
               style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <span className="mt-0.5 flex-shrink-0"><ShieldIcon /></span>
            <p className="text-slate-300 text-sm leading-relaxed">{vuln.recommendation}</p>
          </div>
        </Section>
      )}

      {/* Bottom metadata row */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        {/* Confidence */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-4 flex flex-col items-center gap-2">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Confidence</p>
          <ConfidenceCircle pct={confPct} color={s.color} />
          <p className="text-slate-500 text-xs">{vuln.confidence === 'HIGH' ? 'Very High' : vuln.confidence === 'MEDIUM' ? 'Medium' : 'Low'}</p>
        </div>

        {/* Detected by */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-4 flex flex-col items-center gap-2">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-mono mb-1">Detected By</p>
          <div className="space-y-1.5 w-full">
            <SourceBadge label="AI GenAI" active={vuln.source === 'LLM' || vuln.source === 'BOTH'} color="#9B4DFF" />
            <SourceBadge label="Slither" active={vuln.source === 'SLITHER' || vuln.source === 'BOTH'} color="#00D4FF" />
            <SourceBadge label="AI + Slither" active={vuln.source === 'BOTH'} color="#FF2D7C" />
          </div>
        </div>

        {/* Category */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-4 flex flex-col items-center justify-center gap-1">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Category</p>
          <p className="text-slate-100 text-sm font-medium text-center mt-1">{vuln.category}</p>
          {vuln.swc_id && (
            <p className="text-brand-purple text-xs font-mono">{vuln.swc_id}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Code block with line numbers ──────────────────────────────────────────── */

function CodeBlock({ snippet, lineNumbers }: { snippet: string; lineNumbers: number[] }) {
  if (!snippet) return null

  const lines = snippet.split('\n').filter((_, i, arr) =>
    // trim leading/trailing blank lines
    !(i === 0 && arr[i].trim() === '') && !(i === arr.length - 1 && arr[i].trim() === '')
  )

  const startLine = lineNumbers?.[0] ?? 1
  const highlightSet = new Set(lineNumbers ?? [])

  return (
    <div className="rounded-xl overflow-hidden border border-bg-border">
      <div className="bg-bg-base font-mono text-xs overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              const lineNum = startLine + i
              const isHl = highlightSet.has(lineNum)
              return (
                <tr key={i} style={isHl ? { background: 'rgba(239,68,68,0.10)' } : {}}>
                  {/* Line number */}
                  <td
                    className="select-none text-right pr-4 pl-4 py-0.5 border-r border-bg-border text-slate-600 w-12"
                    style={isHl ? { color: '#EF4444', borderRight: '2px solid #EF4444' } : {}}
                  >
                    {lineNum}
                  </td>
                  {/* Arrow for highlighted line */}
                  <td className="pl-2 pr-1 py-0.5 w-5 text-center">
                    {isHl && <span style={{ color: '#EF4444' }}>→</span>}
                  </td>
                  {/* Code */}
                  <td className="py-0.5 pr-4 text-slate-300 whitespace-pre">
                    <SyntaxLine line={line} highlighted={isHl} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* Very simple Solidity syntax coloring */
function SyntaxLine({ line, highlighted }: { line: string; highlighted: boolean }) {
  const color = highlighted ? '#FCA5A5' : '#CBD5E1'

  // Keywords
  const keywords = /\b(function|require|emit|mapping|address|uint256|uint|bool|string|bytes|public|private|external|internal|view|pure|payable|returns|memory|storage|calldata|if|else|for|while|return|event|modifier|contract|interface|library|constructor|struct|enum|import|pragma|solidity|msg|block|tx)\b/g
  // Strings
  const strings = /"[^"]*"|'[^']*'/g
  // Comments
  const comments = /\/\/.*/g

  // Simple approach: return colored spans
  const parts: { text: string; type: 'keyword' | 'string' | 'comment' | 'normal' }[] = []
  let remaining = line
  let lastIdx = 0

  // We'll just do a simple token split
  const tokenRe = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*|\b(?:function|require|emit|mapping|address|uint256|uint|bool|string|bytes|public|private|external|internal|view|pure|payable|returns|memory|storage|calldata|if|else|for|while|return|event|modifier|contract|interface|library|constructor|struct|enum|import|pragma|solidity|msg|block|tx)\b)/g

  const segments: JSX.Element[] = []
  let last = 0
  let m: RegExpExecArray | null

  while ((m = tokenRe.exec(line)) !== null) {
    if (m.index > last) {
      segments.push(<span key={last} style={{ color }}>{line.slice(last, m.index)}</span>)
    }
    const token = m[0]
    let tokenColor = color
    if (token.startsWith('//')) tokenColor = '#6B7280'
    else if (token.startsWith('"') || token.startsWith("'")) tokenColor = '#86EFAC'
    else tokenColor = '#93C5FD' // keyword blue

    segments.push(<span key={m.index} style={{ color: tokenColor }}>{token}</span>)
    last = m.index + token.length
  }

  if (last < line.length) {
    segments.push(<span key={last} style={{ color }}>{line.slice(last)}</span>)
  }

  return <>{segments}</>
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function Section({ title, titleColor, children }: {
  title: string; titleColor: string; children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-mono font-bold uppercase tracking-widest mb-2"
         style={{ color: titleColor }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function StatCard({ label, count, sev }: { label: string; count: number; sev: Severity }) {
  const s = SEV[sev]
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl px-4 py-3 flex items-center justify-between"
         style={count > 0 ? { borderColor: s.border } : {}}>
      <div>
        <p className="font-display text-2xl font-bold" style={{ fontFamily: 'var(--font-oxanium)', color: s.color }}>
          {count}
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mt-0.5">{label}</p>
      </div>
      <MiniChart color={s.color} />
    </div>
  )
}

function TotalCard({ count }: { count: number }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <p className="font-display text-2xl font-bold text-slate-300" style={{ fontFamily: 'var(--font-oxanium)' }}>
          {count}
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mt-0.5">Total</p>
      </div>
      <span className="text-slate-600 text-xl font-light">+</span>
    </div>
  )
}

function MiniChart({ color }: { color: string }) {
  const heights = [4, 8, 6, 10, 7, 9, 5]
  return (
    <div className="flex items-end gap-0.5 h-6 opacity-60">
      {heights.map((h, i) => (
        <div key={i} className="w-1 rounded-sm" style={{ height: h * 2, background: color }} />
      ))}
    </div>
  )
}

function ConfidenceCircle({ pct, color }: { pct: number; color: string }) {
  const r = 18, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1C2D45" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-slate-200 text-xs font-mono font-bold">{pct}%</span>
    </div>
  )
}

function SourceBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono transition-all
      ${active ? 'border' : 'opacity-30 border border-bg-border'}`}
         style={active ? { background: `${color}15`, borderColor: `${color}40`, color } : {}}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: active ? color : '#6B7280' }} />
      {label}
    </div>
  )
}

function EngineRow({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md bg-bg-surface border border-bg-border flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-300 text-xs leading-none">{label}</p>
        <p className={`text-xs mt-0.5 font-mono ${active ? 'text-green-400' : 'text-slate-600'}`}>
          {active ? 'Active' : 'Inactive'}
        </p>
      </div>
    </div>
  )
}

function AIIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9B4DFF" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function SlitherIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}
