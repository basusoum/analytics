import { useMemo, useState } from 'react'
import { useAlertContext } from '../context/AlertContext'
import { LineChart, Line, BarChart, Bar, ComposedChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { BarChart3 } from 'lucide-react'
import clsx from 'clsx'

const C = { demand: '#c07a6b', supply: '#7a9e7e', inventory: '#c8a669', shortage: '#e07461', excess: '#F97316', ss: '#e07461', ms: '#F97316', P1: '#e07461', P2: '#F97316', P3: '#8b95a5', sku: '#c8a669', site: '#8b95a5' }
const KPI = { zinc: { text: 'text-slate-600', border: '#52525b' }, coral: { text: 'text-red-500', border: '#e07461' }, amber: { text: 'text-orange-500', border: '#F97316' }, steel: { text: 'text-slate-500', border: '#8b95a5' }, gold: { text: 'text-blue-600', border: '#c8a669' }, sage: { text: 'text-green-600', border: '#7a9e7e' } }

function signalType(v) {
  const text = String(v || '')
  if (text.includes('ESTN')) return 'ESTN'
  if (text.includes('MSTN')) return 'MSTN'
  return 'Other'
}

function heatStyle(rate) {
  if (!rate) return { background: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.06)', color: '#71717a' }
  if (rate >= 0.5) return { background: `rgba(224,116,97,${0.18 + rate * 0.48})`, borderColor: 'rgba(224,116,97,0.45)', color: '#fff7f5' }
  if (rate >= 0.25) return { background: `rgba(212,160,74,${0.16 + rate * 0.4})`, borderColor: 'rgba(212,160,74,0.4)', color: '#fff8eb' }
  return { background: `rgba(122,158,126,${0.12 + rate * 0.45})`, borderColor: 'rgba(122,158,126,0.36)', color: '#f4fff5' }
}

function KpiCard({ label, value, sub, color, className }) {
  const c = KPI[color] || KPI.zinc
  return (
    <div className={clsx('kpi-card', className)} style={{ borderLeft: `2px solid ${c.border}` }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{label}</p>
      <p className={clsx('text-[28px] font-extrabold font-mono leading-none tracking-tight mt-2', c.text)}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 font-mono mt-1">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children, className }) {
  return (
    <div className={clsx('glass p-5', className)}>
      <h3 className="text-[11px] font-bold text-slate-700 mb-4 tracking-[0.12em] uppercase">{title}</h3>
      {children}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-800/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 shadow-2xl">
      <p className="text-xs font-semibold text-slate-800 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-semibold text-slate-800">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ data, derived }) {
  const [selectedSku, setSelectedSku] = useState('all')
  const [selectedSite, setSelectedSite] = useState('all')
  const [weekFrom, setWeekFrom] = useState(1)
  const [weekTo, setWeekTo] = useState(12)
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [signalFilter, setSignalFilter] = useState('all')
  const { sendMode, dispatchedIds } = useAlertContext()
  const { skus, sites } = derived || { skus: [], sites: [] }
  const allWeeks = useMemo(() => {
    const ws = [...new Set((data || []).map((r) => r.Week_Index))].sort((a, b) => a - b)
    return ws.length ? ws : [1, 12]
  }, [data])
  const minWeek = allWeeks[0]
  const maxWeek = allWeeks[allWeeks.length - 1]

  const { globalP1, globalP2, globalTotal } = useMemo(() => {
    const alerts = data?.filter((r) => r.Priority && r.Priority !== 'None' && r.Alert_ID) || []
    return { globalP1: alerts.filter((r) => r.Priority === 'P1').length, globalP2: alerts.filter((r) => r.Priority === 'P2').length, globalTotal: alerts.length }
  }, [data])
  const acceptRate = useMemo(() => globalTotal ? (sendMode === 'auto' ? Math.round((globalP1 + globalP2) / globalTotal * 100) : Math.round(dispatchedIds.size / globalTotal * 100)) : 0, [sendMode, dispatchedIds, globalP1, globalP2, globalTotal])

  const m = useMemo(() => {
    const empty = { weeklyData: [], alertStats: { total: 0, p1: 0, p2: 0, p3: 0, avgScore: 0 }, pieData: [], filteredSites: sites, skuShortageTop: [], skuExcessTop: [], siteBreakdown: [], riskSkuTop: [], riskSiteTop: [], matrixRows: [], matrixSites: [], matrixWeeks: 0, riskAlerts: 0 }
    if (!data?.length) return empty

    let scoped = data
    if (selectedSku !== 'all') scoped = scoped.filter((r) => r.SKU === selectedSku)
    const filteredSites = selectedSku !== 'all' ? [...new Set(scoped.map((r) => r.Site))].sort() : sites
    if (selectedSite !== 'all') scoped = scoped.filter((r) => r.Site === selectedSite)
    if (weekFrom > minWeek) scoped = scoped.filter((r) => r.Week_Index >= weekFrom)
    if (weekTo < maxWeek) scoped = scoped.filter((r) => r.Week_Index <= weekTo)

    const filtered = scoped

    const alerts = filtered.filter((r) => {
      if (!r.Priority || r.Priority === 'None' || !r.Alert_ID) return false
      if (priorityFilter !== 'all' && r.Priority !== priorityFilter) return false
      return true
    })
    const alertStats = {
      total: alerts.length,
      p1: alerts.filter((r) => r.Priority === 'P1').length,
      p2: alerts.filter((r) => r.Priority === 'P2').length,
      p3: alerts.filter((r) => r.Priority === 'P3').length,
      avgScore: alerts.length ? Math.round(alerts.reduce((s, r) => s + (r.Priority_Score || 0), 0) / alerts.length) : 0,
    }

    const baselinePairs = new Map()
    for (const row of scoped) {
      const key = `${row.SKU}|${row.Site}`
      if (!baselinePairs.has(key)) baselinePairs.set(key, { ss: row['Target Safety Stock (in Units)'] || 0, ms: row['Target Max Stock (in Units)'] || 0 })
    }
    const safetyBaseline = [...baselinePairs.values()].reduce((s, p) => s + p.ss, 0)
    const maxBaseline = [...baselinePairs.values()].reduce((s, p) => s + p.ms, 0)
    const visibleWeeks = allWeeks.filter((w) => w >= weekFrom && w <= weekTo)
    const byWeek = Object.fromEntries(visibleWeeks.map((w) => [w, { week: `W${w}`, demand: 0, supply: 0, inventory: 0, shortage: 0, excess: 0, ss: safetyBaseline, ms: maxBaseline }]))
    for (const row of filtered) {
      const wk = byWeek[row.Week_Index] || (byWeek[row.Week_Index] = { week: `W${row.Week_Index}`, demand: 0, supply: 0, inventory: 0, shortage: 0, excess: 0, ss: safetyBaseline, ms: maxBaseline })
      wk.demand += row['Total Forecast/Order'] || 0
      wk.supply += row['Total Supply'] || 0
      wk.inventory += row['End. Inventory'] || 0
      wk.shortage += row.Shortage || 0
      wk.excess += row.Excess || 0
    }
    const weeklyData = Object.keys(byWeek).sort((a, b) => +a - +b).map((k) => byWeek[k])
    const pieData = [{ name: 'P1 Critical', value: alertStats.p1, fill: C.P1 }, { name: 'P2 At-Risk', value: alertStats.p2, fill: C.P2 }, { name: 'P3 Potential', value: alertStats.p3, fill: C.P3 }].filter((d) => d.value > 0)

    const shortageMap = {}, excessMap = {}, siteBreakdownMap = {}
    for (const row of filtered) {
      shortageMap[row.SKU] = (shortageMap[row.SKU] || 0) + (row.Shortage || 0)
      excessMap[row.SKU] = (excessMap[row.SKU] || 0) + (row.Excess || 0)
      if (!siteBreakdownMap[row.Site]) siteBreakdownMap[row.Site] = { site: row.Site, P1: 0, P2: 0, P3: 0 }
      if (row.Priority && row.Priority !== 'None' && siteBreakdownMap[row.Site][row.Priority] !== undefined) siteBreakdownMap[row.Site][row.Priority]++
    }

    const risk = alerts.filter((row) => {
      if (signalFilter !== 'all' && signalType(row['Alert Type']) !== signalFilter) return false
      return true
    })

    const skuRisk = {}, siteRisk = {}, pairWeeks = new Map()
    for (const row of risk) {
      skuRisk[row.SKU] = (skuRisk[row.SKU] || 0) + 1
      siteRisk[row.Site] = (siteRisk[row.Site] || 0) + 1
      const key = `${row.SKU}|${row.Site}`
      if (!pairWeeks.has(key)) pairWeeks.set(key, new Set())
      pairWeeks.get(key).add(row.Week_Index)
    }

    const matrixSites = Object.keys(siteRisk).sort((a, b) => (siteRisk[b] || 0) - (siteRisk[a] || 0) || a.localeCompare(b))
    const matrixSkus = Object.keys(skuRisk).sort((a, b) => (skuRisk[b] || 0) - (skuRisk[a] || 0) || a.localeCompare(b))

    return {
      weeklyData,
      alertStats,
      pieData,
      filteredSites,
      skuShortageTop: Object.entries(shortageMap).map(([sku, Shortage]) => ({ sku, Shortage })).sort((a, b) => b.Shortage - a.Shortage).slice(0, 10),
      skuExcessTop: Object.entries(excessMap).map(([sku, Excess]) => ({ sku, Excess })).sort((a, b) => b.Excess - a.Excess).slice(0, 10),
      siteBreakdown: Object.values(siteBreakdownMap).sort((a, b) => (b.P1 + b.P2 + b.P3) - (a.P1 + a.P2 + a.P3)),
      riskSkuTop: Object.entries(skuRisk).map(([sku, count]) => ({ sku, count })).sort((a, b) => b.count - a.count || a.sku.localeCompare(b.sku)).slice(0, 10),
      riskSiteTop: Object.entries(siteRisk).map(([site, count]) => ({ site, count })).sort((a, b) => b.count - a.count || a.site.localeCompare(b.site)).slice(0, 10),
      matrixRows: matrixSkus.map((sku) => ({ sku, total: skuRisk[sku] || 0, cells: matrixSites.map((site) => { const weekCount = pairWeeks.get(`${sku}|${site}`)?.size || 0; return { site, weekCount, rate: visibleWeeks.length ? weekCount / visibleWeeks.length : 0 } }) })),
      matrixSites,
      matrixWeeks: visibleWeeks.length,
      riskAlerts: risk.length,
    }
  }, [data, selectedSku, selectedSite, sites, weekFrom, weekTo, priorityFilter, signalFilter, minWeek, maxWeek, allWeeks])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 stagger stagger-1">
        <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-display">Analytics Dashboard</h2>
          <p className="text-xs text-slate-600 mt-0.5 font-mono">Inventory trends ┬╖ demand patterns ┬╖ alert intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-6 flex-wrap stagger stagger-2">
        <select value={selectedSku} onChange={(e) => { setSelectedSku(e.target.value); setSelectedSite('all') }} className="select-dark"><option value="all">All SKUs ({skus.length})</option>{skus.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="select-dark"><option value="all">All Sites ({m.filteredSites.length})</option>{m.filteredSites.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="select-dark"><option value="all">All Priorities</option><option value="P1">P1 Critical</option><option value="P2">P2 At-Risk</option><option value="P3">P3 Potential</option></select>
        <select value={signalFilter} onChange={(e) => setSignalFilter(e.target.value)} className="select-dark"><option value="all">All Types</option><option value="MSTN">MSTN</option><option value="ESTN">ESTN</option></select>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-700">Wk From</span>
          <select value={weekFrom} onChange={(e) => setWeekFrom(Number(e.target.value))} className="select-dark">{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select>
          <span className="text-[10px] font-mono text-slate-700">To</span>
          <select value={weekTo} onChange={(e) => setWeekTo(Number(e.target.value))} className="select-dark">{allWeeks.map((w) => <option key={w} value={w}>{w}</option>)}</select>
        </div>
        {(selectedSku !== 'all' || selectedSite !== 'all' || priorityFilter !== 'all' || signalFilter !== 'all' || weekFrom > minWeek || weekTo < maxWeek) && <button onClick={() => { setSelectedSku('all'); setSelectedSite('all'); setPriorityFilter('all'); setSignalFilter('all'); setWeekFrom(minWeek); setWeekTo(maxWeek) }} className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">Reset</button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total Alerts" value={m.alertStats.total} color="zinc" className="stagger stagger-1" />
        <KpiCard label="P1 Critical" value={m.alertStats.p1} sub={m.alertStats.total ? `${Math.round(m.alertStats.p1 / m.alertStats.total * 100)}% of total` : ''} color="coral" className="stagger stagger-2" />
        <KpiCard label="P2 At-Risk" value={m.alertStats.p2} color="amber" className="stagger stagger-3" />
        <KpiCard label="P3 Potential" value={m.alertStats.p3} color="steel" className="stagger stagger-4" />
        <KpiCard label="Avg Score" value={m.alertStats.avgScore} sub="out of 100" color="gold" className="stagger stagger-5" />
        <KpiCard label="Alerts Communicated" value={`${acceptRate}%`} sub={sendMode === 'auto' ? 'auto - P1+P2 dispatched' : dispatchedIds.size === 0 ? 'no dispatches yet' : `${dispatchedIds.size} manually sent`} color={sendMode === 'auto' ? 'sage' : acceptRate >= 40 ? 'sage' : 'amber'} className="stagger stagger-6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Demand vs Supply Trend"><ResponsiveContainer width="100%" height={280}><LineChart data={m.weeklyData}><XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} /><YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} /><Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={8} /><Line type="monotone" dataKey="demand" name="Demand" stroke={C.demand} strokeWidth={2.5} dot={{ r: 3, fill: C.demand }} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="supply" name="Supply" stroke={C.supply} strokeWidth={2.5} dot={{ r: 3, fill: C.supply }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Inventory Level vs Safety & Max Stock"><ResponsiveContainer width="100%" height={280}><ComposedChart data={m.weeklyData}><XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} /><YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} /><Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={8} /><Area type="monotone" dataKey="inventory" name="Inventory" fill={C.inventory} fillOpacity={0.15} stroke={C.inventory} strokeWidth={2.5} /><Line type="monotone" dataKey="ss" name="Safety Stock" stroke={C.ss} strokeWidth={1.5} strokeDasharray="6 3" dot={false} /><Line type="monotone" dataKey="ms" name="Max Stock" stroke={C.ms} strokeWidth={1.5} strokeDasharray="6 3" dot={false} /></ComposedChart></ResponsiveContainer></ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Shortage & Excess by Week (Units)" className="lg:col-span-2"><ResponsiveContainer width="100%" height={260}><BarChart data={m.weeklyData} barGap={2}><XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} /><YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} /><Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={8} /><Bar dataKey="shortage" name="Shortage Units" fill={C.shortage} radius={[4, 4, 0, 0]} maxBarSize={32} /><Bar dataKey="excess" name="Excess Units" fill={C.excess} radius={[4, 4, 0, 0]} maxBarSize={32} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Alert Distribution">{m.pieData.length > 0 ? <div className="flex flex-col items-center"><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={m.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>{m.pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer><div className="flex flex-col gap-2 w-full mt-2">{m.pieData.map((d, i) => <div key={i} className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} /><span className="text-[11px] text-slate-600">{d.name}</span></div><span className="text-[11px] font-semibold text-slate-700">{d.value}</span></div>)}</div></div> : <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">No alerts for current selection</div>}</ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Top SKUs - Shortage Units">{m.skuShortageTop.length > 0 ? <ResponsiveContainer width="100%" height={260}><BarChart data={m.skuShortageTop} layout="vertical" margin={{ left: 0, right: 12 }}><XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="sku" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={72} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="Shortage" name="Shortage Units" radius={[0, 4, 4, 0]} maxBarSize={18}>{m.skuShortageTop.map((_, i) => <Cell key={i} fill={i === 0 ? C.shortage : `${C.shortage}${Math.round(255 * (1 - i * 0.08)).toString(16).padStart(2, '0')}`} />)}</Bar></BarChart></ResponsiveContainer> : <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No shortage data</div>}</ChartCard>
        <ChartCard title="Top SKUs - Excess Units">{m.skuExcessTop.length > 0 ? <ResponsiveContainer width="100%" height={260}><BarChart data={m.skuExcessTop} layout="vertical" margin={{ left: 0, right: 12 }}><XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="sku" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={72} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="Excess" name="Excess Units" radius={[0, 4, 4, 0]} maxBarSize={18}>{m.skuExcessTop.map((_, i) => <Cell key={i} fill={i === 0 ? C.excess : `${C.excess}${Math.round(255 * (1 - i * 0.08)).toString(16).padStart(2, '0')}`} />)}</Bar></BarChart></ResponsiveContainer> : <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No excess data</div>}</ChartCard>
        <ChartCard title="Site Priority Breakdown">{m.siteBreakdown.length > 0 ? <ResponsiveContainer width="100%" height={260}><BarChart data={m.siteBreakdown} margin={{ left: 0, right: 8 }}><XAxis dataKey="site" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#27272a' }} tickLine={false} /><YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={7} /><Bar dataKey="P1" name="P1 Critical" stackId="a" fill={C.P1} maxBarSize={28} /><Bar dataKey="P2" name="P2 At-Risk" stackId="a" fill={C.P2} maxBarSize={28} /><Bar dataKey="P3" name="P3 Potential" stackId="a" fill={C.P3} maxBarSize={28} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No site data</div>}</ChartCard>
      </div>

      <div className="mt-6 mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Alert Concentration</h3>
        <p className="text-[11px] text-slate-600 font-mono mt-1">Matrix shows repeated alert weeks for each SKU-site pair over the visible week window.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top SKUs - Alert Occurrences">{m.riskSkuTop.length > 0 ? <ResponsiveContainer width="100%" height={260}><BarChart data={m.riskSkuTop} layout="vertical" margin={{ left: 0, right: 12 }}><XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} /><YAxis type="category" dataKey="sku" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={84} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" name="Alert Occurrences" radius={[0, 4, 4, 0]} fill={C.sku} maxBarSize={18} /></BarChart></ResponsiveContainer> : <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No alert occurrence data</div>}</ChartCard>
        <ChartCard title="Top Sites - Alert Occurrences">{m.riskSiteTop.length > 0 ? <ResponsiveContainer width="100%" height={260}><BarChart data={m.riskSiteTop} layout="vertical" margin={{ left: 0, right: 12 }}><XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} /><YAxis type="category" dataKey="site" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={84} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="count" name="Alert Occurrences" radius={[0, 4, 4, 0]} fill={C.site} maxBarSize={18} /></BarChart></ResponsiveContainer> : <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No alert occurrence data</div>}</ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="SKU x Site Alert Rate Matrix">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="text-[11px] font-mono text-slate-600">{m.riskAlerts.toLocaleString()} alert occurrences in scope ┬╖ denominator {m.matrixWeeks || 0} visible weeks</div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sage/60" /> low</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/70" /> medium</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-coral/70" /> high</span></div>
          </div>
          {m.matrixRows.length > 0 && m.matrixSites.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white text-left px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 min-w-[120px]">SKU</th>
                    {m.matrixSites.map((site) => <th key={site} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700 min-w-[96px]">{site}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {m.matrixRows.map((row) => (
                    <tr key={row.sku}>
                      <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-top"><div className="text-[11px] font-semibold text-slate-800">{row.sku}</div><div className="text-[10px] font-mono text-slate-600">{row.total} alerts</div></th>
                      {row.cells.map((cell) => {
                        const style = heatStyle(cell.rate)
                        return (
                          <td key={`${row.sku}-${cell.site}`} className="p-0.5">
                            <div className="rounded-lg border px-2 py-2 text-center min-h-[64px] flex flex-col items-center justify-center" style={style} title={`${row.sku} @ ${cell.site}: ${cell.weekCount}/${m.matrixWeeks || 0} alert weeks`}>
                              <div className="text-[12px] font-bold font-mono leading-none">{Math.round(cell.rate * 100)}%</div>
                              <div className="text-[10px] font-mono mt-1 opacity-90">{cell.weekCount}/{m.matrixWeeks || 0}</div>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">No alert concentration data for the current filters</div>}
        </ChartCard>
      </div>
    </div>
  )
}
