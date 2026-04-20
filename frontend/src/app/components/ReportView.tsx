'use client'

import { useState } from 'react'
import type { AuditReport, Severity, Vulnerability } from '@/types/report'

const SEV_COLORS: Record<Severity, { bg: string; border: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-500' },
  HIGH:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  MEDIUM:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  LOW:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   dot: 'bg-blue-500' },
  INFO:     { bg: 'bg-slate-500/10',  border: 'border-slate-500/30',  text: 'text-slate-400',  dot: 'bg-slate-500' },
}

const SOURCE_COLORS: Record<string, string> = {
  BOTH:    'bg-accent/10 text-accent border-accent/30',
  LLM:     'bg-purple-500/10 text-purple-400 border-purple-500/30',
  SLITHER: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
}

interface Props {
  report: AuditReport
  onReset: () => void
}

export default function ReportView({ report, onReset }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<Severity | 'ALL'>('ALL')

  const { meta, overall_risk, summary, contract_info, statistics, vulnerabilities, positive_findings, gas_optimizations } = report

  const sevStyle = SEV_COLORS[overall_risk] ?? SEV_COLORS.INFO

  const filtered = activeFilter === 'ALL'
    ? vulnerabilities
    : vulnerabilities.filter((v) => v.severity === activeFilter)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${sevStyle.dot} ${overall_risk === 'CRITICAL' ? 'badge-critical' : ''}`} />
          <span className="font-mono text-sm text-slate-400">{meta.contract_name}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-xs text-slate-600">{formatDate(meta.audit_timestamp)}</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-mono text-slate-500 hover:text-accent transition-colors border border-bg-border hover:border-accent/30 px-3 py-1.5 rounded-lg"
        >
          ← New audit
        </button>
      </div>

      {/* ── Overall risk card ── */}
      <div className={`rounded-xl border ${sevStyle.border} ${sevStyle.bg} p-6`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Overall Risk</p>
            <p className={`font-display text-4xl font-bold ${sevStyle.text}`}>{overall_risk}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-slate-500 mb-1">Model</p>
            <p className="font-mono text-xs text-slate-400">{meta.llm_model}</p>
            <p className="text-xs font-mono text-slate-500 mt-2 mb-1">Slither</p>
            <p className={`font-mono text-xs ${meta.slither_available ? 'text-emerald-400' : 'text-slate-600'}`}>
              {meta.slither_available ? 'Available' : 'Unavailable'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-slate-300 text-sm leading-relaxed">{summary}</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {(['critical', 'high', 'medium', 'low', 'info'] as const).map((s) => {
          const sev = s.toUpperCase() as Severity
          const c = SEV_COLORS[sev]
          const count = statistics[s] ?? 0
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(activeFilter === sev ? 'ALL' : sev)}
              className={`rounded-lg border p-3 text-center transition-all
                ${activeFilter === sev ? `${c.bg} ${c.border}` : 'border-bg-border hover:border-bg-border bg-bg-surface hover:' + c.bg}
              `}
            >
              <p className={`font-display text-2xl font-bold ${c.text}`}>{count}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{s}</p>
            </button>
          )
        })}
        <div className="rounded-lg border border-bg-border bg-bg-surface p-3 text-center">
          <p className="font-display text-2xl font-bold text-slate-300">{statistics.total}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">Total</p>
        </div>
      </div>

      {/* ── Contract info ── */}
      {contract_info && Object.keys(contract_info).length > 0 && (
        <div className="rounded-xl border border-bg-border bg-bg-surface p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoItem label="Solidity" value={contract_info.solidity_version || '—'} />
          <InfoItem label="Contracts" value={contract_info.contract_names?.join(', ') || '—'} />
          <InfoItem label="Lines" value={contract_info.total_lines ? String(contract_info.total_lines) : '—'} />
          <InfoItem label="Inheritance" value={contract_info.uses_inheritance ? 'Yes' : 'No'} />
          <InfoItem label="External calls" value={contract_info.uses_external_calls ? 'Yes' : 'No'} />
          <InfoItem label="Assembly" value={contract_info.uses_assembly ? 'Yes' : 'No'} />
        </div>
      )}

      {/* ── Vulnerabilities ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-slate-400">
            Vulnerabilities
            {activeFilter !== 'ALL' && <span className={`ml-2 text-xs ${SEV_COLORS[activeFilter].text}`}>({activeFilter})</span>}
          </h2>
          {activeFilter !== 'ALL' && (
            <button onClick={() => setActiveFilter('ALL')} className="text-xs text-slate-600 hover:text-accent transition-colors font-mono">
              clear filter ×
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-bg-border bg-bg-surface p-8 text-center text-slate-500 font-mono text-sm">
            No vulnerabilities found for this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((vuln) => (
              <VulnCard
                key={vuln.id}
                vuln={vuln}
                open={openId === vuln.id}
                onToggle={() => setOpenId(openId === vuln.id ? null : vuln.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Positive findings ── */}
      {positive_findings?.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="font-display text-xs uppercase tracking-widest text-emerald-400 mb-3">
            ✓ Security practices correctly implemented
          </h2>
          <ul className="space-y-1.5">
            {positive_findings.map((f, i) => (
              <li key={i} className="text-sm text-slate-400 flex gap-2">
                <span className="text-emerald-500 mt-0.5">·</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Gas optimizations ── */}
      {gas_optimizations?.length > 0 && (
        <div className="rounded-xl border border-bg-border bg-bg-surface p-5">
          <h2 className="font-display text-xs uppercase tracking-widest text-slate-400 mb-3">
            Gas Optimizations
          </h2>
          <div className="space-y-3">
            {gas_optimizations.map((g, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-mono text-xs text-slate-600 pt-0.5">#{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-slate-300">{g.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>
                  <p className="font-mono text-xs text-accent/60 mt-1">{g.affected_function}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pipeline errors (if any) ── */}
      {meta.pipeline_errors?.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-xs font-mono text-yellow-400 mb-2">⚠ Pipeline warnings</p>
          {meta.pipeline_errors.map((e, i) => (
            <p key={i} className="text-xs text-slate-500 font-mono">{e}</p>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── VulnCard ─────────────────────────────────────────────────────────────── */

function VulnCard({ vuln, open, onToggle }: { vuln: Vulnerability; open: boolean; onToggle: () => void }) {
  const c = SEV_COLORS[vuln.severity] ?? SEV_COLORS.INFO
  const src = SOURCE_COLORS[vuln.source] ?? SOURCE_COLORS.LLM

  return (
    <div className={`rounded-xl border transition-all duration-200 ${open ? `${c.border} ${c.bg}` : 'border-bg-border bg-bg-surface hover:border-bg-border'}`}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot} ${vuln.severity === 'CRITICAL' ? 'badge-critical' : ''}`} />
        <span className={`font-mono text-xs font-bold flex-shrink-0 ${c.text}`}>{vuln.severity}</span>
        <span className="text-sm text-slate-200 font-medium flex-1 truncate">{vuln.title}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {vuln.swc_id && (
            <span className="font-mono text-xs text-slate-600 hidden sm:block">{vuln.swc_id}</span>
          )}
          <span className={`font-mono text-xs border px-2 py-0.5 rounded-full ${src}`}>
            {vuln.source}
          </span>
          <span className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <ChevronIcon />
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-bg-border pt-4 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <Detail label="Function" value={vuln.affected_function} />
            <Detail label="Category" value={vuln.category} />
            <Detail label="Confidence" value={vuln.confidence} />
            {vuln.line_numbers?.length > 0 && (
              <Detail label="Lines" value={`L${vuln.line_numbers.join(', L')}`} />
            )}
          </div>

          {vuln.affected_code_snippet && (
            <pre className="text-xs font-mono bg-bg-base border border-bg-border rounded-lg p-3 overflow-x-auto text-slate-300 leading-relaxed">
              {vuln.affected_code_snippet}
            </pre>
          )}

          <Section title="Description" text={vuln.description} />
          {vuln.exploitation_scenario && (
            <Section title="Exploitation scenario" text={vuln.exploitation_scenario} color="text-orange-400" />
          )}
          {vuln.recommendation && (
            <Section title="Recommendation" text={vuln.recommendation} color="text-emerald-400" />
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-600 text-xs mb-0.5">{label}</p>
      <p className="text-slate-300 text-xs">{value}</p>
    </div>
  )
}

function Section({ title, text, color = 'text-accent' }: { title: string; text: string; color?: string }) {
  return (
    <div>
      <p className={`text-xs font-mono ${color} mb-1.5`}>{title}</p>
      <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-600 font-mono mb-0.5">{label}</p>
      <p className="text-sm text-slate-300 font-mono truncate">{value}</p>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
