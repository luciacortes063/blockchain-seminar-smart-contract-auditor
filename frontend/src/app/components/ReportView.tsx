'use client'

import { useState } from 'react'
import type { AuditReport, Severity, Vulnerability } from '@/types/report'

/* ─── Severity palette ──────────────────────────────────────────────────────── */
const SEV: Record<Severity, {
  color: string; bg: string; border: string; badgeBg: string; badgeText: string; label: string
}> = {
  CRITICAL: { color:'#EF4444', bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.35)',  badgeBg:'rgba(239,68,68,0.2)',  badgeText:'#F87171', label:'CRITICAL' },
  HIGH:     { color:'#F97316', bg:'rgba(249,115,22,0.08)', border:'rgba(249,115,22,0.35)', badgeBg:'rgba(249,115,22,0.2)', badgeText:'#FB923C', label:'HIGH'     },
  MEDIUM:   { color:'#EAB308', bg:'rgba(234,179,8,0.08)',  border:'rgba(234,179,8,0.35)',  badgeBg:'rgba(234,179,8,0.2)',  badgeText:'#FDE047', label:'MEDIUM'   },
  LOW:      { color:'#3B82F6', bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.35)', badgeBg:'rgba(59,130,246,0.2)', badgeText:'#60A5FA', label:'LOW'      },
  INFO:     { color:'#6B7280', bg:'rgba(107,114,128,0.08)',border:'rgba(107,114,128,0.25)',badgeBg:'rgba(107,114,128,0.2)',badgeText:'#9CA3AF', label:'INFO'     },
}
const CONF_PCT: Record<string, number> = { HIGH:95, MEDIUM:70, LOW:40 }
const SIDEBAR_INIT = 7

/* ─── Root ──────────────────────────────────────────────────────────────────── */
export default function ReportView({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  const { meta, overall_risk, contract_info, statistics, vulnerabilities } = report
  const [sel, setSel]         = useState(0)
  const [showAll, setShowAll] = useState(false)

  const visible  = showAll ? vulnerabilities : vulnerabilities.slice(0, SIDEBAR_INIT)
  const hiddenN  = vulnerabilities.length - SIDEBAR_INIT
  const selected = vulnerabilities[sel] ?? null

  return (
    <div className="min-h-screen flex flex-col gap-4 p-5" style={{ background:'#070B13' }}>

      {/* ══ HEADER CARD ════════════════════════════════════════════════════ */}
      <div style={{ background:'linear-gradient(135deg,#00D4FF,#9B4DFF,#FF2D7C)', padding:1, borderRadius:16 }}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 rounded-2xl"
             style={{ background:'#0D1526' }}>
          {/* Left */}
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight mb-3"
                style={{ fontFamily:'var(--font-oxanium)', background:'linear-gradient(90deg,#00D4FF,#9B4DFF,#FF2D7C)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Smart Contract Auditor
            </h1>
            <div className="flex items-center gap-2 mb-1.5">
              <FileDocIcon />
              <span className="text-slate-100 font-medium text-sm">{meta.contract_name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
              {contract_info?.solidity_version && <span>Solidity: {contract_info.solidity_version}</span>}
              {contract_info?.total_lines > 0  && <span>Lines: {contract_info.total_lines}</span>}
              <span style={{ color:'#4ADE80' }}>✓ Analysis completed</span>
            </div>
          </div>
          {/* Right: Analysis Engine */}
          <div className="flex-shrink-0 rounded-xl border px-4 py-3 min-w-[170px]"
               style={{ borderColor:'#1C2D45', background:'#0A1220' }}>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-3">Analysis Engine</p>
            <div className="space-y-2">
              <EngineRow icon={<AiBadgeIcon />} label="GenAI Semantic" active={true} />
              <EngineRow icon={<SlitherBadgeIcon />} label="Slither Static" active={meta.slither_available} />
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS ═══════════════════════════════════════════════════════════ */}
      <div>
        <p className="text-slate-200 text-sm font-medium mb-3">Vulnerabilities</p>
        <div className="grid grid-cols-5 gap-3">
          <StatCard sev="CRITICAL" count={statistics.critical} icon={<EkgIcon color="#EF4444" />} />
          <StatCard sev="HIGH"     count={statistics.high}     icon={<BarIcon  color="#F97316" />} />
          <StatCard sev="MEDIUM"   count={statistics.medium}   icon={<BarIcon  color="#EAB308" />} />
          <StatCard sev="LOW"      count={statistics.low}      icon={<BarIcon  color="#3B82F6" />} />
          <TotalCard count={statistics.total} />
        </div>
      </div>

      {/* ══ TWO-COLUMN ══════════════════════════════════════════════════════ */}
      <div className="flex gap-3 flex-1 min-h-0" style={{ height:'calc(100vh - 310px)', minHeight:480 }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <div className="flex flex-col rounded-2xl overflow-hidden flex-shrink-0 w-64"
             style={{ background:'#0D1526', border:'1px solid #1C2D45' }}>
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b" style={{ borderColor:'#1C2D45' }}>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-mono font-semibold">Security Analysis</p>
            <p className="text-slate-500 text-xs mt-0.5">Vulnerabilities ({vulnerabilities.length})</p>
          </div>
          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {visible.map((v, i) => {
              const s = SEV[v.severity] ?? SEV.INFO
              const isSel = sel === i
              return (
                <button key={v.id} onClick={() => setSel(i)}
                  className="w-full text-left relative border-b transition-all duration-150"
                  style={{
                    borderColor:'#1C2D45',
                    background: isSel ? '#111D30' : 'transparent',
                    outline: isSel ? `1px solid ${s.color}40` : 'none',
                    outlineOffset: -1,
                  }}>
                  {/* Severity left bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: s.color }} />
                  <div className="px-4 py-3 pl-3.5">
                    <p className={`text-sm font-medium leading-snug mb-2 ${isSel ? 'text-slate-100' : 'text-slate-300'}`}>
                      {v.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ background: s.badgeBg, color: s.badgeText }}>
                        {s.label}
                      </span>
                      {v.swc_id && <span className="text-xs text-slate-600 font-mono">{v.swc_id}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
            {!showAll && hiddenN > 0 && (
              <button onClick={() => setShowAll(true)}
                className="w-full py-3 text-xs font-mono text-brand-cyan hover:text-brand-purple transition-colors border-t"
                style={{ borderColor:'#1C2D45', color:'#60A5FA' }}>
                Show {hiddenN} more ↓
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT DETAIL PANEL ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto rounded-2xl"
             style={{ background:'linear-gradient(135deg,#00D4FF22,#9B4DFF22,#FF2D7C22)', padding:1 }}>
          <div className="h-full rounded-2xl overflow-y-auto" style={{ background:'#0D1526' }}>
            {selected
              ? <VulnDetail vuln={selected} />
              : <div className="flex h-full items-center justify-center text-slate-600 font-mono text-sm">Select a vulnerability</div>
            }
          </div>
        </div>
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between">
        <button onClick={onReset}
          className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors border rounded-full px-4 py-1.5"
          style={{ borderColor:'#1C2D45' }}>
          ← New Audit
        </button>
        <p className="text-xs text-slate-600 font-mono">{meta.llm_model}</p>
      </div>
    </div>
  )
}

/* ─── Vulnerability detail ──────────────────────────────────────────────────── */
function VulnDetail({ vuln }: { vuln: Vulnerability }) {
  const s = SEV[vuln.severity] ?? SEV.INFO
  const confPct = CONF_PCT[vuln.confidence] ?? 70

  return (
    <div className="p-5 space-y-5">

      {/* Severity pill + title + desc */}
      <div>
        <span className="inline-block text-xs font-mono font-bold px-3 py-1 rounded mb-3"
              style={{ background: s.badgeBg, color: s.badgeText }}>
          {s.label}
        </span>
        <h2 className="font-display font-bold text-2xl text-slate-100 leading-tight mb-2"
            style={{ fontFamily:'var(--font-oxanium)' }}>
          {vuln.title}
        </h2>
        {vuln.description && (
          <p className="text-slate-400 text-sm leading-relaxed">{vuln.description}</p>
        )}
      </div>

      {/* IMPACT */}
      {vuln.exploitation_scenario && (
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-widest mb-2"
             style={{ color:'#F97316' }}>Impact</p>
          <div className="rounded-xl p-4 flex gap-3 items-start"
               style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
            <span className="flex-shrink-0 mt-0.5"><TriangleWarnIcon /></span>
            <p className="text-slate-300 text-sm leading-relaxed">{vuln.exploitation_scenario}</p>
          </div>
        </div>
      )}

      {/* LOCATION */}
      {vuln.affected_code_snippet && (
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-widest mb-2"
             style={{ color:'#2DD4BF' }}>Location</p>
          <CodeBlock snippet={vuln.affected_code_snippet} lineNumbers={vuln.line_numbers ?? []} />
        </div>
      )}

      {/* RECOMMENDATION */}
      {vuln.recommendation && (
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-widest mb-2"
             style={{ color:'#4ADE80' }}>Recommendation</p>
          <div className="rounded-xl p-4 flex gap-3 items-start"
               style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)' }}>
            <span className="flex-shrink-0 mt-0.5"><ShieldCheckIcon /></span>
            <p className="text-slate-300 text-sm leading-relaxed">{vuln.recommendation}</p>
          </div>
        </div>
      )}

      {/* Bottom metadata row */}
      <div className="grid grid-cols-3 gap-3 pt-1">

        {/* Confidence */}
        <div className="rounded-xl p-4 flex flex-col items-center gap-2"
             style={{ background:'#0A1220', border:'1px solid #1C2D45' }}>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Confidence</p>
          <ConfCircle pct={confPct} color={s.color} />
          <p className="text-slate-500 text-xs">
            {vuln.confidence === 'HIGH' ? 'Very High' : vuln.confidence === 'MEDIUM' ? 'Medium' : 'Low'}
          </p>
        </div>

        {/* Detected By */}
        <div className="rounded-xl p-4 flex flex-col items-center gap-2.5"
             style={{ background:'#0A1220', border:'1px solid #1C2D45' }}>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Detected By</p>
          <div className="grid grid-cols-2 gap-1.5 w-full">
            <DetectedBadge label="AI GenAI"    active={vuln.source==='LLM'||vuln.source==='BOTH'} color="#9B4DFF" icon="ai" />
            <DetectedBadge label="Slither"     active={vuln.source==='SLITHER'||vuln.source==='BOTH'} color="#00D4FF" icon="sl" />
            <DetectedBadge label="AI"          active={false} color="#9B4DFF" icon="ai" />
            <DetectedBadge label="GenAI+Slither" active={vuln.source==='BOTH'} color="#FF2D7C" icon="both" />
          </div>
        </div>

        {/* Category */}
        <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-1"
             style={{ background:'#0A1220', border:'1px solid #1C2D45' }}>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-mono">Category</p>
          <p className="text-slate-100 text-base font-semibold text-center mt-1"
             style={{ fontFamily:'var(--font-oxanium)' }}>
            {vuln.category}
          </p>
          {vuln.swc_id && (
            <p className="text-xs font-mono font-bold" style={{ color:'#9B4DFF' }}>{vuln.swc_id}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Code block ────────────────────────────────────────────────────────────── */
function CodeBlock({ snippet, lineNumbers }: { snippet: string; lineNumbers: number[] }) {
  const rawLines = snippet.split('\n')
  // Strip leading/trailing empty lines
  let start = 0, end = rawLines.length - 1
  while (start <= end && rawLines[start].trim() === '') start++
  while (end >= start && rawLines[end].trim() === '')   end--
  const lines = rawLines.slice(start, end + 1)

  // First absolute line number to use for display
  const firstLineNum = lineNumbers.length > 0 ? lineNumbers[0] : 1
  const hlSet = new Set(lineNumbers)

  return (
    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid #1C2D45', background:'#060A10' }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs font-mono">
          <tbody>
            {lines.map((line, i) => {
              const absLine = firstLineNum + i
              const hl = hlSet.has(absLine)
              return (
                <tr key={i} style={hl ? { background:'rgba(239,68,68,0.12)' } : {}}>
                  {/* Line number */}
                  <td className="select-none text-right pl-4 pr-3 py-1 w-10"
                      style={{
                        color: hl ? '#F87171' : '#3D4F6B',
                        borderRight: hl ? '2px solid #EF4444' : '1px solid #1C2D45',
                        verticalAlign:'top',
                        paddingTop: 5, paddingBottom: 5,
                      }}>
                    {absLine}
                  </td>
                  {/* Arrow column */}
                  <td className="w-5 text-center" style={{ color:'#EF4444', paddingTop:5, verticalAlign:'top' }}>
                    {hl ? '→' : ' '}
                  </td>
                  {/* Code */}
                  <td className="pl-2 pr-4 py-1 whitespace-pre" style={{ verticalAlign:'top', paddingTop:5, paddingBottom:5 }}>
                    <SolidityLine code={line} highlighted={hl} />
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

/* Solidity syntax highlighter */
function SolidityLine({ code, highlighted }: { code: string; highlighted: boolean }) {
  const baseColor  = highlighted ? '#FCA5A5' : '#94A3B8'
  const kwColor    = '#60A5FA'   // blue   — keywords
  const strColor   = '#86EFAC'   // green  — strings / addresses
  const numColor   = '#FCD34D'   // amber  — numbers
  const cmtColor   = '#4B5563'   // gray   — comments

  const tokenRe = /(\/\/[^\n]*|"[^"]*"|'[^']*'|\b0x[0-9a-fA-F]+\b|\b\d+\b|\b(?:function|require|emit|mapping|address|uint256|uint|bool|string|bytes|public|private|external|internal|view|pure|payable|returns|memory|storage|calldata|if|else|for|while|return|event|modifier|contract|interface|library|constructor|struct|enum|import|pragma|solidity|msg|block|tx|true|false)\b)/g

  const parts: React.ReactElement[] = []
  let last = 0, m: RegExpExecArray | null

  while ((m = tokenRe.exec(code)) !== null) {
    if (m.index > last) {
      parts.push(<span key={last} style={{ color: baseColor }}>{code.slice(last, m.index)}</span>)
    }
    const tok = m[0]
    let c = baseColor
    if (tok.startsWith('//'))                        c = cmtColor
    else if (tok.startsWith('"') || tok.startsWith("'")) c = strColor
    else if (/^\d|^0x/.test(tok))                   c = numColor
    else                                              c = kwColor
    parts.push(<span key={m.index} style={{ color: c }}>{tok}</span>)
    last = m.index + tok.length
  }
  if (last < code.length) {
    parts.push(<span key={last} style={{ color: baseColor }}>{code.slice(last)}</span>)
  }
  return <>{parts}</>
}

/* ─── Stat card ──────────────────────────────────────────────────────────────── */
function StatCard({ sev, count, icon }: { sev: Severity; count: number; icon: React.ReactNode }) {
  const s = SEV[sev]
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
         style={{ background:'#0D1526', border:`1px solid ${count > 0 ? s.border : '#1C2D45'}` }}>
      <div>
        <p className="font-display text-3xl font-bold leading-none" style={{ fontFamily:'var(--font-oxanium)', color: s.color }}>{count}</p>
        <p className="text-xs font-mono uppercase tracking-wider mt-1" style={{ color: s.color, opacity:0.7 }}>{s.label}</p>
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  )
}

function TotalCard({ count }: { count: number }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
         style={{ background:'#0D1526', border:'1px solid #1C2D45' }}>
      <div>
        <p className="font-display text-3xl font-bold leading-none text-slate-300" style={{ fontFamily:'var(--font-oxanium)' }}>{count}</p>
        <p className="text-xs font-mono uppercase tracking-wider mt-1 text-slate-500">Total</p>
      </div>
      <span className="text-slate-600 text-2xl font-light">+</span>
    </div>
  )
}

/* ─── Confidence circle ─────────────────────────────────────────────────────── */
function ConfCircle({ pct, color }: { pct: number; color: string }) {
  const r = 20, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <div className="relative flex items-center justify-center" style={{ width:56, height:56 }}>
      <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#1C2D45" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="text-slate-200 font-mono text-xs font-bold">{pct}%</span>
    </div>
  )
}

/* ─── Detected By badge ──────────────────────────────────────────────────────── */
function DetectedBadge({ label, active, color, icon }: { label:string; active:boolean; color:string; icon:string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-all"
         style={{
           background: active ? `${color}18` : 'transparent',
           border: `1px solid ${active ? color+'50' : '#1C2D45'}`,
           color: active ? color : '#374151',
           opacity: active ? 1 : 0.45,
         }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: active ? color : '#374151' }} />
      <span className="truncate">{label}</span>
    </div>
  )
}

/* ─── Engine row ──────────────────────────────────────────────────────────────── */
function EngineRow({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background:'#0D1526', border:'1px solid #1C2D45' }}>
        {icon}
      </div>
      <div>
        <p className="text-slate-300 text-xs leading-none">{label}</p>
        <p className="text-xs font-mono font-bold mt-0.5" style={{ color: active ? '#4ADE80' : '#374151' }}>
          {active ? 'Active' : 'Inactive'}
        </p>
      </div>
    </div>
  )
}

/* ─── Icons ───────────────────────────────────────────────────────────────────── */
function FileDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B4DFF" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function AiBadgeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B4DFF" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  )
}

function SlitherBadgeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function TriangleWarnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  )
}

function EkgIcon({ color }: { color: string }) {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <polyline points="0,12 8,12 11,4 14,20 17,8 20,16 23,12 40,12"
                stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function BarIcon({ color }: { color: string }) {
  const h = [6, 10, 8, 14, 10, 12, 7]
  return (
    <svg width="32" height="18" viewBox="0 0 32 18" fill="none">
      {h.map((ht, i) => (
        <rect key={i} x={i * 5} y={18 - ht} width="3.5" height={ht} rx="1"
              fill={color} opacity={0.6 + i * 0.05} />
      ))}
    </svg>
  )
}
