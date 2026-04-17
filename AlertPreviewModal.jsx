import { Eye, X } from 'lucide-react'
import clsx from 'clsx'

const PRI_BADGE = {
  P1: 'badge-p1',
  P2: 'badge-p2',
  P3: 'badge-p3',
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function AlertCard({ alert }) {
  const dispatchDate = formatDate(new Date())
  const priBadge = PRI_BADGE[alert.Priority] || 'badge-p3'

  return (
    <div className="glass-inner p-4 mb-3 last:mb-0">
      {/* Row 1: Alert ID + Date */}
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[11px] text-slate-500">{alert.Alert_ID}</span>
        <span className="text-[11px] text-slate-600">{dispatchDate}</span>
      </div>

      {/* Grid: SKU / Site / Week / Type */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-0.5">SKU</div>
          <div className="text-[13px] font-bold text-slate-900">{alert.SKU}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-0.5">Site</div>
          <div className="text-[13px] text-slate-800">{alert.Site}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-0.5">Week</div>
          <div className="font-mono text-[13px] text-slate-800">W{alert.Week_Index}</div>
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-0.5">Alert Type</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{alert['Alert Type'] || '—'}</span>
        </div>
      </div>

      {/* Priority badge */}
      <div className="mb-3">
        <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-1">Priority</div>
        <span className={clsx('badge', priBadge)}>{alert.Priority}</span>
      </div>

      {/* RCA Summary */}
      {alert.RCA_Summary && (
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500 mb-1">RCA Summary</div>
          <p className="text-[12px] text-slate-700 leading-relaxed">{alert.RCA_Summary}</p>
        </div>
      )}
    </div>
  )
}

export default function AlertPreviewModal({ alerts, onConfirm, onDiscard }) {
  const count = alerts.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm animate-fade-in"
        onClick={onDiscard}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
      >
        <div
          className="glass pointer-events-auto w-full max-w-lg flex flex-col animate-slide-up shadow-2xl"
          style={{ maxHeight: '85vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-start justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                  Alert Preview — {count} Alert{count !== 1 ? 's' : ''} Selected
                </h2>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Review before sending</p>
              </div>
            </div>
            <button
              onClick={onDiscard}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.07] text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors ml-3 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable alert list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {alerts.map(alert => (
              <AlertCard key={`${alert.Alert_ID}-${alert.Week_Index}`} alert={alert} />
            ))}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              onClick={onDiscard}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white/[0.07] border border-slate-300/40 hover:bg-slate-200 hover:text-slate-800 transition-all"
            >
              Discard
            </button>
            <button
              onClick={onConfirm}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              Confirm &amp; Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
