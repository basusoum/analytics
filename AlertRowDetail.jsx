import clsx from 'clsx'
import { useState, useEffect } from 'react'

const AI_AGENT_URL = 'http://localhost:8001/api/recommendations'

// ── Static fallback (used when AI agent is unreachable) ───────────────────────
function getStaticActions(row) {
  const shortage = row.Shortage || 0
  const excess   = row.Excess   || 0
  const mstn     = row['MSTN%'] || 0
  const estn     = row['ESTN%'] || 0
  const lt       = row['Lead Time'] || 0
  const priority = row.Priority
  const actions  = []

  if (priority === 'None') {
    actions.push({ icon: '✓', text: 'No action required — inventory position is healthy.', urgency: 'low' })
    return actions
  }
  if (shortage > 0) {
    if (mstn <= 0) {
      actions.push({ icon: '🚨', text: 'Immediate escalation — stockout imminent. Expedite emergency supply or redistribute from nearest site with surplus.', urgency: 'critical' })
      actions.push({ icon: '📞', text: 'Notify downstream stakeholders of potential delivery impact.', urgency: 'critical' })
    } else if (mstn < 50) {
      actions.push({ icon: '⚡', text: 'Expedite existing purchase orders to accelerate supply arrival.', urgency: 'high' })
      actions.push({ icon: '🔄', text: 'Evaluate inter-site stock redistribution from lower-demand locations.', urgency: 'high' })
    } else if (mstn < 90) {
      actions.push({ icon: '📋', text: 'Review demand forecast accuracy — adjust if over-forecasted.', urgency: 'medium' })
      actions.push({ icon: '📦', text: 'Pre-position backup supply to prevent further deterioration.', urgency: 'medium' })
    } else {
      actions.push({ icon: '👁', text: 'Monitor — minor shortage, likely to self-correct with next replenishment.', urgency: 'low' })
    }
    if (lt && lt <= 2) {
      actions.push({ icon: '⏱', text: `Lead time is ${lt} week${lt !== 1 ? 's' : ''} — limited window to act before next cycle.`, urgency: 'high' })
    }
  }
  if (excess > 0) {
    if (estn > 20) {
      actions.push({ icon: '🛑', text: 'Hold or defer incoming orders to stop inventory buildup.', urgency: 'high' })
      actions.push({ icon: '💰', text: 'Evaluate promotional push or volume discount to accelerate sell-through.', urgency: 'high' })
    } else if (estn > 10) {
      actions.push({ icon: '⏸', text: 'Defer next planned replenishment — current stock exceeds max threshold.', urgency: 'medium' })
      actions.push({ icon: '📊', text: 'Review demand forecast — may be under-forecasted, causing excess build.', urgency: 'medium' })
    } else {
      actions.push({ icon: '👁', text: 'Monitor — slight excess may self-correct with upcoming demand.', urgency: 'low' })
    }
  }
  if (priority === 'P1' || priority === 'P2') {
    actions.push({ icon: '🔧', text: 'Review safety stock and reorder point parameters for this SKU–Site combination.', urgency: 'medium' })
  }
  return actions
}

// ── AI Recommendations hook ───────────────────────────────────────────────────
function useRecommendations(row) {
  const [actions, setActions]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [source,  setSource]    = useState('ai')   // 'ai' | 'fallback'

  useEffect(() => {
    if (!row) return
    setLoading(true)
    setActions([])

    const payload = {
      SKU:            row.SKU,
      Site:           row.Site,
      Priority:       row.Priority,
      Alert:          row.Alert,
      Week_Index:     row.Week_Index,
      MSTN_pct:       row['MSTN%'],
      ESTN_pct:       row['ESTN%'],
      Shortage:       row.Shortage,
      Excess:         row.Excess,
      Lead_Time:      row['Lead Time'],
      Start_Inventory: row['Start Inventory'],
      Total_Supply:   row['Total Supply'],
      Total_Demand:   row['Total Forecast/Order'] || row['Total Demand'],
      End_Inventory:  row['End. Inventory'],
      Safety_Stock:   row['Target Safety Stock (in Units)'],
      Max_Stock:      row['Target Max Stock (in Units)'],
      Business_Unit:  row['Business Unit'],
      RCA_Summary:    row.RCA_Summary,
      SKU_Desc:       row['SKU Desc'],
      Site_Desc:      row['Site Desc'],
      Days_of_Coverage: row['Days of Coverage'],
      Priority_Score: row.Priority_Score,
    }

    fetch(AI_AGENT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setActions(data.actions || [])
        setSource(data.source || 'ai')
      })
      .catch(() => {
        setActions(getStaticActions(row))
        setSource('fallback')
      })
      .finally(() => setLoading(false))
  }, [row?.SKU, row?.Site, row?.Week_Index])

  return { actions, loading, source }
}

const URGENCY = {
  critical: { bg: 'bg-red-50',         border: 'border-red-200',          text: 'text-red-500'        },
  high:     { bg: 'bg-orange-500/8',     border: 'border-orange-500/15',      text: 'text-orange-500'   },
  medium:   { bg: 'bg-white/40',     border: 'border-slate-200',        text: 'text-slate-600'    },
  low:      { bg: 'bg-sage/8',          border: 'border-green-100',            text: 'text-green-600'        },
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="mb-4 rounded-xl p-3.5 border border-slate-200 bg-white shadow-sm">
      <div className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500 mb-3 pb-2.5 border-b border-slate-100">
        {title}
      </div>
      {children}
    </div>
  )
}

function FlowBox({ label, value, accent, sub }) {
  return (
    <div className="text-center flex-1">
      <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-slate-600 mb-1">{label}</div>
      <div
        className="rounded-lg p-2"
        style={{ background: accent ? `${accent}12` : '#F8FAFC', border: `1px solid ${accent || 'rgba(0, 0, 0, 0.08)'}` }}
      >
        <div className="font-mono text-[15px] font-bold leading-none" style={{ color: accent || '#1E293B' }}>
          {Number(value || 0).toLocaleString()}
        </div>
        {sub && <div className="text-[8px] text-slate-600 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

function FlowOp({ symbol, color }) {
  return (
    <div className="flex items-center pt-4 font-mono text-[16px] font-bold flex-shrink-0" style={{ color }}>
      {symbol}
    </div>
  )
}

function ProgressBar({ label, value, colorFn, dimmed, note }) {
  const pct = Math.min(100, Math.max(0, value || 0))
  const color = dimmed ? '#3f3f46' : colorFn(pct)
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1.5">
        <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-slate-600">{label}</span>
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {note && <p className="text-[9px] font-mono text-slate-500 mt-1 italic">{note}</p>}
    </div>
  )
}

const PRI_COLOR = { P1: '#EF4444', P2: '#F97316', P3: '#3B82F6' }
const PRI_BG    = { P1: '#FEE2E2', P2: '#FFEDD5', P3: '#EFF6FF' }

// ── Main Component ────────────────────────────────────────────────────────────
export default function AlertRowDetail({ row, onClose }) {
  if (!row) return null

  const p        = row.Priority
  const opening  = row['Start Inventory'] || 0
  const supply   = row['Total Supply']    || 0
  const demand   = row['Total Forecast/Order'] || row['Total Demand'] || 0
  const closing  = row['End. Inventory'] || 0
  const ss       = row['Target Safety Stock (in Units)'] || 0
  const maxStock = row['Target Max Stock (in Units)']    || 0
  const lt       = row['Lead Time']

  const closingColor  = closing < 0 ? '#e07461' : closing < ss ? '#F97316' : closing > maxStock ? '#F97316' : '#7a9e7e'
  const closingStatus = closing < ss ? '↓ below SS' : closing > maxStock ? '↑ above Max' : '✓ healthy'

  const { actions, loading, source } = useRecommendations(row)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[460px] flex flex-col z-50 slide-in-right"
        style={{ background: '#FFFFFF', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-start justify-between" style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div>
            <div className="font-mono text-[15px] font-bold text-slate-800 tracking-tight">{row.SKU}</div>
            <div className="text-[10px] text-slate-600 font-mono mt-0.5">
              {row.Site} ({row['Site Type'] || 'DC'}) · W{row.Week_Index} · {row['Business Unit'] || ''}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.06] text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Priority + Alert badges */}
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button onClick={onClose} className="px-4 py-1 text-[10px] font-mono font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
            OK
          </button>
          <span
            className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg"
            style={{ background: PRI_BG[p], color: PRI_COLOR[p], border: `1px solid ${PRI_COLOR[p]}30` }}
          >
            {p}
          </span>
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
            style={{ background: PRI_BG[p], color: PRI_COLOR[p], border: `1px solid ${PRI_COLOR[p]}20` }}
          >
            {row.Alert}
          </span>
          {row.Alert_ID && (
            <span className="font-mono text-[9px] text-slate-600 bg-white/[0.06] border border-slate-200 px-2 py-1 rounded">
              {row.Alert_ID}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Inventory Flow */}
          <Section title={`Inventory Flow — Week ${row.Week_Index}`}>
            <div className="flex items-start gap-1.5 mb-3">
              <FlowBox label="Opening"  value={opening} />
              <FlowOp  symbol="+"  color="#7a9e7e" />
              <FlowBox label="Supply"   value={supply}  accent={supply > 0 ? '#7a9e7e' : null} />
              <FlowOp  symbol="−"  color="#e07461" />
              <FlowBox label="Demand"   value={demand}  accent="#c07a6b" />
              <FlowOp  symbol="="  color="#71717a" />
              <FlowBox label="Closing"  value={closing} accent={closingColor} sub={closingStatus} />
            </div>
            <div className="flex gap-4 text-[9px] font-mono text-slate-500">
              <span>SS: <strong className="text-slate-700">{ss.toLocaleString()}</strong></span>
              <span>Max: <strong className="text-slate-700">{maxStock.toLocaleString()}</strong></span>
              {lt != null && <span>LT: <strong className="text-slate-700">{lt} wks</strong></span>}
            </div>
          </Section>

          {/* Health Scores */}
          <Section title="Health Scores">
            <ProgressBar
              label="MSTN — Shortage Score (target: 100%)"
              value={row['MSTN%']}
              colorFn={p => p < 50 ? '#e07461' : p < 90 ? '#F97316' : '#7a9e7e'}
              dimmed={closing > maxStock}
              note={closing > maxStock ? 'N/A — inventory exceeds max stock (excess situation)' : null}
            />
            <ProgressBar
              label="ESTN — Excess Score (target: 0%)"
              value={row['ESTN%']}
              colorFn={p => p > 20 ? '#e07461' : p > 0 ? '#F97316' : '#52525b'}
              dimmed={closing < ss}
              note={closing < ss ? 'N/A — inventory below safety stock (shortage situation)' : null}
            />
          </Section>

          {/* Shortage / Excess callouts */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Shortage', value: row.Shortage || 0, unit: 'units', active: (row.Shortage || 0) > 0, color: '#e07461', bg: 'rgba(224,116,97,0.08)', border: 'rgba(224,116,97,0.18)' },
              { label: 'Excess',   value: row.Excess   || 0, unit: 'units', active: (row.Excess   || 0) > 0, color: '#F97316', bg: 'rgba(212,160,74,0.08)',  border: 'rgba(212,160,74,0.18)'  },
              { label: 'OOS Value', value: Number(row['Out of stock Value($)'] || 0), unit: '$', active: Number(row['Out of stock Value($)'] || 0) > 0, color: '#e07461', bg: 'rgba(224,116,97,0.08)', border: 'rgba(224,116,97,0.18)' },
              { label: 'Excess Val', value: Number(row['Excess and over($)']   || 0), unit: '$', active: Number(row['Excess and over($)']   || 0) > 0, color: '#F97316', bg: 'rgba(212,160,74,0.08)',  border: 'rgba(212,160,74,0.18)'  },
            ].map(({ label, value, unit, active, color, bg, border }) => (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{ background: active ? bg : '#F8FAFC', border: `1px solid ${active ? border : 'rgba(0, 0, 0, 0.06)'}` }}
              >
                <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-slate-600 mb-1">{label}</div>
                <div className="font-mono text-[18px] font-bold leading-none" style={{ color: active ? color : '#52525b' }}>
                  {unit === '$' ? '$' : ''}{Number(value).toLocaleString()}
                  <span className="text-[9px] font-normal text-slate-500 ml-1">{unit === '$' ? '' : unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Agentic RCA */}
          {row.Agentic_RCA && (
            <Section title="Root Cause Analysis/AI Insights">
              <div
                className="rounded-lg p-3.5 text-[12px] leading-relaxed text-slate-800 relative overflow-hidden"
                style={{ background: 'rgba(59,130,246,0.04)', borderLeft: '3px solid rgba(59,130,246,0.5)' }}
              >
                {row.Agentic_RCA}
              </div>
            </Section>
          )}

          {/* Recommended Actions */}
          <Section title={
            <span className="flex items-center gap-2">
              Recommended Actions
              {!loading && (
                <span
                  className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: source === 'ai' ? 'rgba(122,158,126,0.15)' : 'rgba(113,113,122,0.15)',
                    color:      source === 'ai' ? '#7a9e7e' : '#71717a',
                    border:     source === 'ai' ? '1px solid rgba(122,158,126,0.25)' : '1px solid rgba(113,113,122,0.2)',
                  }}
                >
                  {source === 'ai' ? '✦ AI' : 'Static'}
                </span>
              )}
            </span>
          }>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="h-10 rounded-lg animate-pulse"
                      style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}
                    />
                ))}
                <p className="text-[9px] font-mono text-slate-500 text-center mt-1">AI agent thinking...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {actions.map((action, i) => {
                  const s = URGENCY[action.urgency] || URGENCY.medium
                  return (
                    <div
                      key={i}
                      className={clsx('flex items-start gap-2.5 p-2.5 rounded-lg border', s.bg, s.border)}
                    >
                      <span className="text-[13px] flex-shrink-0 mt-0.5">{action.icon}</span>
                      <span className="text-[11px] leading-relaxed text-slate-800">{action.text}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

        </div>
      </div>
    </>
  )
}
