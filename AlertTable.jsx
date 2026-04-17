import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ShieldAlert, Send, CheckCircle, ChevronDown, ChevronUp, Search, Zap, Radio, Columns, X, Download, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import Papa from 'papaparse'
import { useAlertContext } from '../context/AlertContext'
import AlertRowDetail from './AlertRowDetail'
import AlertPreviewModal from './AlertPreviewModal'

// ── Constants ─────────────────────────────────────────────────────────────────
const PRI = {
  P1: { badge: 'badge-p1', label: 'Critical',  dot: 'bg-red-500' },
  P2: { badge: 'badge-p2', label: 'At-Risk',   dot: 'bg-orange-500' },
  P3: { badge: 'badge-p3', label: 'Potential', dot: 'bg-blue-300' },
}

const SCORE_BG = {
  P1: 'linear-gradient(90deg, #EF4444, #B91C1C)',
  P2: 'linear-gradient(90deg, #F97316, #C2410C)',
  P3: 'linear-gradient(90deg, #3B82F6, #1E4ED8)',
}

const ALERT_TYPE_STYLE = {
  'Critical MSTN': { bg: 'bg-red-100',       text: 'text-red-500',     border: 'border-red-200' },
  'High MSTN':     { bg: 'bg-orange-500/[0.12]',   text: 'text-orange-500', border: 'border-orange-500/25' },
  'High ESTN':     { bg: 'bg-orange-100',       text: 'text-orange-500',    border: 'border-orange-200' },
  'Medium MSTN':   { bg: 'bg-blue-100',         text: 'text-blue-600',      border: 'border-blue-200' },
  'Low MSTN':      { bg: 'bg-green-100',         text: 'text-green-600',      border: 'border-green-200' },
  'Low ESTN':      { bg: 'bg-green-50',         text: 'text-green-600/80',   border: 'border-green-100' },
}

const ALL_COLS = [
  { key: 'Priority',       label: 'Priority',   filterable: true  },
  { key: 'Priority_Score', label: 'Score',       mono: true        },
  { key: 'Alert_ID',       label: 'Alert ID',    mono: true        },
  { key: 'SKU',            label: 'SKU',         bold: true, filterable: true },
  { key: 'Site',           label: 'Site',        filterable: true  },
  { key: 'Site Type',      label: 'Site Type',   filterable: true  },
  { key: 'Week_Index',     label: 'Week',        mono: true, filterable: true },
  { key: 'Alert',          label: 'Alert',       filterable: true  },
  { key: 'Alert Type',     label: 'Type',        filterable: true  },
  { key: 'Shortage',       label: 'Shortage',    mono: true        },
  { key: 'Excess',         label: 'Excess',      mono: true        },
  { key: 'MSTN%',          label: 'MSTN%',       mono: true        },
  { key: 'ESTN%',          label: 'ESTN%',       mono: true        },
  { key: 'Out of stock Value($)', label: 'Out of Stock Value ($)', mono: true, wide: true },
  { key: 'Excess and over($)',   label: 'Excess and Over ($)',   mono: true, wide: true },
  { key: '_trend',         label: 'Trend',       mono: true, computed: true },
  { key: 'Agentic_RCA',    label: 'Root Cause Analysis/AI Insights', wide: true        },
]

const DEFAULT_VISIBLE = new Set([
  'Priority', 'Priority_Score', 'Alert_ID', 'SKU', 'Site', 'Site Type',
  'Week_Index', 'Alert', 'Alert Type', 'Shortage', 'Excess', 'Out of stock Value($)', 'Excess and over($)', 
  'Agentic_RCA',
])

const PAGE_SIZES = [25, 50, 100]

function getStatisticalStats(values) {
  if (!values || values.length === 0) return { mean: 0, stdDev: 0 };
  const nums = values.map(v => Number(v)).filter(n => !isNaN(n));
  if (nums.length === 0) return { mean: 0, stdDev: 0 };

  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / nums.length;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}

// ── Column Filter Dropdown ────────────────────────────────────────────────────
function ColumnFilterDropdown({ colKey, rows, colFilters, setColFilters, anchorRect, onClose }) {
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const allValues = useMemo(() => {
    const s = new Set()
    for (const r of rows) {
      const v = r[colKey]
      s.add(v == null || v === '' ? '(Blank)' : String(v))
    }
    return [...s].sort((a, b) => {
      if (a === '(Blank)') return 1
      if (b === '(Blank)') return -1
      const na = Number(a), nb = Number(b)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })
  }, [rows, colKey])

  const current      = colFilters[colKey]
  const isAllSelected = !current
  const display      = search ? allValues.filter(v => v.toLowerCase().includes(search.toLowerCase())) : allValues
  const isChecked    = (v) => isAllSelected || current.has(v)

  const toggleValue = (val) => {
    setColFilters(prev => {
      const next = { ...prev }
      if (!next[colKey]) {
        const s = new Set(allValues)
        s.delete(val)
        next[colKey] = s
      } else {
        const s = new Set(next[colKey])
        s.has(val) ? s.delete(val) : s.add(val)
        if (s.size === allValues.length) delete next[colKey]
        else next[colKey] = s
      }
      return next
    })
  }

  const selectAll = () => setColFilters(p => { const n = { ...p }; delete n[colKey]; return n })
  const clearAll  = () => setColFilters(p => ({ ...p, [colKey]: new Set() }))

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const top  = anchorRect ? anchorRect.bottom + 4 : 0
  const left = anchorRect ? Math.min(anchorRect.left, window.innerWidth - 240) : 0

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 300 }}
      className="w-56 max-h-72 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-2.5 border-b border-slate-200">
        <input
          autoFocus
          placeholder="Search values..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-300"
        />
      </div>
      <div className="flex gap-1.5 px-2.5 py-1.5 border-b border-slate-200">
        <button onClick={selectAll} className="flex-1 py-1 text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
          Select All
        </button>
        <button onClick={clearAll} className="flex-1 py-1 text-[10px] font-mono font-bold text-red-500 bg-red-50 border border-red-200 rounded-md cursor-pointer hover:bg-red-100 transition-colors">
          Clear All
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {display.length === 0
          ? <div className="px-3 py-4 text-center text-[11px] text-slate-500">No matches</div>
          : display.map(val => (
            <label key={val} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isChecked(val)}
                onChange={() => toggleValue(val)}
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ accentColor: '#c8a669' }}
              />
              <span className="text-[11px] font-mono text-slate-700 overflow-hidden text-ellipsis whitespace-nowrap">{val}</span>
            </label>
          ))
        }
      </div>
      <div className="flex items-center justify-between px-2.5 py-2 border-t border-slate-200">
        <span className="text-[10px] font-mono text-slate-500">
          {current ? `${current.size}/${allValues.length}` : `All ${allValues.length}`}
        </span>
        <button onClick={onClose} className="px-4 py-1 text-[10px] font-mono font-bold bg-gold text-[#09090b] rounded-md hover:bg-gold-bright transition-colors cursor-pointer">
          OK
        </button>
      </div>
    </div>
  )
}

// ── Column Visibility Toggle ──────────────────────────────────────────────────
function ColumnToggleDropdown({ visibleCols, setVisibleCols, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const toggle = (key) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size <= 3) return prev; next.delete(key) }
      else next.add(key)
      return next
    })
  }

  const showAll    = () => setVisibleCols(new Set(ALL_COLS.map(c => c.key)))
  const hiddenCount = ALL_COLS.length - visibleCols.size

  return (
    <div
      ref={ref}
      className="absolute top-9 right-0 z-50 w-52 max-h-80 bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500">Columns</span>
        {hiddenCount > 0 && (
          <button onClick={showAll} className="text-[10px] font-mono font-bold text-blue-600 hover:text-blue-600-bright transition-colors">
            Show All
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {ALL_COLS.map(col => (
          <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={visibleCols.has(col.key)}
              onChange={() => toggle(col.key)}
              className="w-3 h-3 rounded flex-shrink-0"
              style={{ accentColor: '#c8a669' }}
            />
            <span className="text-[11px] font-mono text-slate-700">{col.label}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200">
        <span className="text-[10px] font-mono text-slate-500">{visibleCols.size}/{ALL_COLS.length} visible</span>
        <button onClick={onClose} className="px-4 py-1 text-[10px] font-mono font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
          OK
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AlertTable({ data, userRole }) {
  // Top-level filters
  const [priFilter,       setPriFilter]       = useState('all')
  const [skuFilter,       setSkuFilter]       = useState('all')
  const [siteFilter,      setSiteFilter]      = useState('all')
  const [siteTypeFilter,  setSiteTypeFilter]  = useState('all')
  const [alertTypeFilter, setAlertTypeFilter] = useState('all')
  const [weekFilter,      setWeekFilter]      = useState('all')
  const [search,          setSearch]          = useState('')

  // Sort
  const [sortField, setSortField] = useState('Priority_Score')
  const [sortDir,   setSortDir]   = useState('desc')

  // Pagination
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Column filters
  const [colFilters,    setColFilters]    = useState({})
  const [openColFilter, setOpenColFilter] = useState(null)
  const [filterAnchor,  setFilterAnchor]  = useState(null)

  // Column visibility
  const [visibleCols,   setVisibleCols]   = useState(DEFAULT_VISIBLE)
  const [showColToggle, setShowColToggle] = useState(false)

  // Row detail drawer
  const [selectedRow, setSelectedRow] = useState(null)

  // Send comm (via context)
  const [selected,     setSelected]     = useState(new Set())
  const [showToast,    setShowToast]    = useState(false)
  const [toastMsg,     setToastMsg]     = useState('')
  const [showPreview,  setShowPreview]  = useState(false)
  const { sendMode, setSendMode, dispatchedIds, dispatch } = useAlertContext()

  // ── Base alerts ─────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    if (!data?.length) return []
    return data.filter(r => r.Priority && r.Priority !== 'None' && r.Alert_ID)
  }, [data])

  // ── WoW MSTN% trend (computed from ALL data rows) ───────────────────────────
  const trendLookup = useMemo(() => {
    if (!data?.length) return {}
    const groups = {}
    for (const r of data) {
      const k = `${r.SKU}|${r.Site}`
      if (!groups[k]) groups[k] = []
      groups[k].push(r)
    }
    for (const arr of Object.values(groups)) arr.sort((a, b) => a.Week_Index - b.Week_Index)
    const lookup = {}
    for (const arr of Object.values(groups)) {
      arr.forEach((r, i) => {
        const mstn = r['MSTN%'], prev = i > 0 ? arr[i - 1]['MSTN%'] : null
        lookup[`${r.SKU}|${r.Site}|${r.Week_Index}`] =
          (mstn != null && prev != null) ? Math.round((mstn - prev) * 10) / 10 : null
      })
    }
    return lookup
  }, [data])

  const thresholdsMap = useMemo(() => {
    if (!data?.length) return {}
    const groups = {}
    for (const r of data) {
      if (!r.SKU || !r.Site) continue
      const k = `${r.SKU}|${r.Site}`
      if (!groups[k]) groups[k] = { shortage: [], excess: [], oos: [], env: [] }
      groups[k].shortage.push(r.Shortage)
      groups[k].excess.push(r.Excess)
      groups[k].oos.push(r['Out of stock Value($)'])
      groups[k].env.push(r['Excess and over($)'])
    }
    const lookup = {}
    for (const [k, obj] of Object.entries(groups)) {
      lookup[k] = {
        'Shortage': getStatisticalStats(obj.shortage),
        'Excess': getStatisticalStats(obj.excess),
        'Out of stock Value($)': getStatisticalStats(obj.oos),
        'Excess and over($)': getStatisticalStats(obj.env)
      }
    }
    return lookup
  }, [data])

  const enrichedAlerts = useMemo(() =>
    alerts.map(r => ({
      ...r,
      _trendDelta: trendLookup[`${r.SKU}|${r.Site}|${r.Week_Index}`] ?? null,
    }))
  , [alerts, trendLookup])

  // ── Filter option lists ──────────────────────────────────────────────────────
  const { skus, sites, weeks, alertTypes } = useMemo(() => ({
    skus:       [...new Set(alerts.map(a => a.SKU))].sort(),
    sites:      [...new Set(alerts.map(a => a.Site))].sort(),
    weeks:      [...new Set(alerts.map(a => a.Week_Index))].sort((a, b) => a - b),
    alertTypes: [...new Set(alerts.map(a => a['Alert Type']).filter(Boolean))].sort(),
  }), [alerts])

  const availableSites = useMemo(() => {
    if (siteTypeFilter === 'all') return sites
    return [...new Set(alerts.filter(a => a['Site Type'] === siteTypeFilter).map(a => a.Site))].sort()
  }, [alerts, sites, siteTypeFilter])

  // ── Top-level filter ─────────────────────────────────────────────────────────
  const topFiltered = useMemo(() =>
    enrichedAlerts.filter(a => {
      if (priFilter       !== 'all' && a.Priority        !== priFilter)       return false
      if (skuFilter       !== 'all' && a.SKU             !== skuFilter)       return false
      if (siteFilter      !== 'all' && a.Site            !== siteFilter)      return false
      if (siteTypeFilter  !== 'all' && a['Site Type']    !== siteTypeFilter)   return false
      if (alertTypeFilter !== 'all' && a['Alert Type']   !== alertTypeFilter) return false
      if (weekFilter      !== 'all' && String(a.Week_Index) !== weekFilter)   return false
      if (search) {
        const s = search.toLowerCase()
        if (!(a.Alert_ID?.toLowerCase().includes(s) || a.SKU?.toLowerCase().includes(s) ||
              a.Site?.toLowerCase().includes(s)      || a.Alert?.toLowerCase().includes(s)))
          return false
      }
      return true
    })
  , [enrichedAlerts, priFilter, skuFilter, siteFilter, alertTypeFilter, weekFilter, search])

  // ── Column filter ────────────────────────────────────────────────────────────
  const colFiltered = useMemo(() => {
    const keys = Object.keys(colFilters)
    if (!keys.length) return topFiltered
    return topFiltered.filter(row => {
      for (const key of keys) {
        const allowed = colFilters[key]
        if (!allowed.size) return false
        const v = row[key]
        if (!allowed.has(v == null || v === '' ? '(Blank)' : String(v))) return false
      }
      return true
    })
  }, [topFiltered, colFilters])

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = useMemo(() =>
    [...colFiltered].sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'desc' ? bv - av : av - bv
      return sortDir === 'desc'
        ? String(bv).localeCompare(String(av))
        : String(av).localeCompare(String(bv))
    })
  , [colFiltered, sortField, sortDir])

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalRows  = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paged      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── Counts for quick stats ───────────────────────────────────────────────────
  const priCounts = useMemo(() => {
    const c = { P1: 0, P2: 0, P3: 0 }
    for (const a of topFiltered) if (c[a.Priority] !== undefined) c[a.Priority]++
    return c
  }, [topFiltered])

  const activeCols          = useMemo(() => ALL_COLS.filter(c => visibleCols.has(c.key)), [visibleCols])
  const activeColFilterCount = Object.keys(colFilters).length

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (sendMode === 'manual') {
      if (!selected.size) return
      setShowPreview(true)
    } else {
      // Automatic mode: send P1 and P2 alerts
      const autoIds = enrichedAlerts
        .filter(a => (a.Priority === 'P1' || a.Priority === 'P2') && !dispatchedIds.has(a.Alert_ID))
        .map(a => a.Alert_ID)
      
      if (autoIds.length > 0) {
        setToastMsg('Dispatching P1 + P2 alerts...')
        setShowToast(true)
        const success = await dispatch(autoIds)
        if (success) {
          setToastMsg(`Dispatched ${autoIds.length} P1 + P2 alert${autoIds.length !== 1 ? 's' : ''} successfully`)
        } else {
          setToastMsg('Failed to dispatch alerts. Check console for details.')
        }
      } else {
        setToastMsg('No new P1 or P2 alerts to dispatch')
        setShowToast(true)
      }
      setTimeout(() => setShowToast(false), 3500)
    }
  }

  const handlePreviewConfirm = async () => {
    const ids = [...selected]
    setToastMsg(`Sending ${ids.length} alert${ids.length !== 1 ? 's' : ''}...`)
    setShowToast(true)
    
    const success = await dispatch(ids)
    if (success) {
      setToastMsg(`Dispatched ${ids.length} alert${ids.length !== 1 ? 's' : ''} via Power Automate`)
      setSelected(new Set())
      setShowPreview(false)
    } else {
      setToastMsg('Failed to dispatch. Check console for details.')
    }
    setTimeout(() => setShowToast(false), 3500)
  }

  const handlePreviewDiscard = () => {
    setShowPreview(false)
  }

  const handleColFilterClick = useCallback((colKey, e) => {
    e.stopPropagation()
    if (openColFilter === colKey) { setOpenColFilter(null); return }
    setFilterAnchor(e.currentTarget.getBoundingClientRect())
    setOpenColFilter(colKey)
  }, [openColFilter])

  const clearAllColFilters = () => { setColFilters({}); setPage(1) }

  const resetTopFilters = () => {
    setPriFilter('all'); setSkuFilter('all'); setSiteFilter('all')
    setSiteTypeFilter('all'); setAlertTypeFilter('all'); setWeekFilter('all'); setSearch('')
  }

  const handleDownloadCSV = async (rows, filename = 'alert_center_data') => {
    if (!rows || rows.length === 0) return
    const csv = Papa.unparse(rows)
    const csvData = "\ufeff" + csv
    const datedFilename = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: datedFilename,
          types: [{
            description: 'CSV File',
            accept: { 'text/csv': ['.csv'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(csvData);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('FilePicker failed, trying fallback...', err);
      }
    }

    try {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", datedFilename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download failed', err)
    }
  }

  const activeTopFilterCount = [
    priFilter !== 'all', skuFilter !== 'all', siteFilter !== 'all',
    siteTypeFilter !== 'all', alertTypeFilter !== 'all', weekFilter !== 'all', !!search,
  ].filter(Boolean).length

  // ── Cell renderer ────────────────────────────────────────────────────────────
  const renderCell = (col, row) => {
    const val = row[col.key]
    switch (col.key) {
      case 'Priority':
        return <span className={clsx('badge', PRI[row.Priority]?.badge)}>{row.Priority}</span>

      case 'Priority_Score':
        return (
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, val || 0)}%`, background: SCORE_BG[row.Priority] || '#94A3B8' }} />
            </div>
            <span className="font-mono text-[11px] text-slate-900 font-medium">{val}</span>
          </div>
        )

      case 'Alert_ID':
        return <span className="font-mono text-[10px] text-slate-900">{val}</span>

      case 'Week_Index':
        return <span className="font-mono text-slate-900 font-medium">W{val}</span>

      case 'Alert Type': {
        const ts = ALERT_TYPE_STYLE[val]
        return ts
          ? <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-md border', ts.bg, ts.text, ts.border)}>{val}</span>
          : <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-300 font-medium">{val}</span>
      }

      case 'Shortage':
      case 'Excess':
      case 'Out of stock Value($)':
      case 'Excess and over($)': {
        const stats = thresholdsMap[`${row.SKU}|${row.Site}`]?.[col.key]
        const n = Number(val || 0)
        if (n <= 0) return <span className="text-slate-400">—</span>

        let colorClass = (col.key === 'Excess' ? 'text-orange-500' : (col.key === 'Excess and over($)' ? 'text-amber-600' : 'text-red-500'))
        
        if (stats) {
          const { mean, stdDev } = stats
          if (stdDev > 0) {
            const zScore = (n - mean) / stdDev
            if (zScore > 3) {
              colorClass = 'text-red-600 font-bold'
            } else if (zScore > 1.5) {
              colorClass = 'text-amber-600 font-bold'
            } else {
              colorClass = 'text-slate-700'
            }
          } else if (n > mean) {
            colorClass = 'text-red-600 font-bold'
          } else {
            colorClass = 'text-slate-700'
          }
        }

        const isMoney = col.key.includes('$')
        return (
          <span className={clsx('font-mono', colorClass)}>
            {isMoney ? `$${n.toLocaleString()}` : n.toLocaleString()}
          </span>
        )
      }

      case 'MSTN%': {
        const p = Number(val)
        const c = p < 50 ? 'text-red-500' : p < 90 ? 'text-orange-500' : 'text-green-600'
        return <span className={clsx('font-mono text-[11px] font-semibold', c)}>{val}%</span>
      }

      case 'ESTN%': {
        const p = Number(val)
        const c = p > 20 ? 'text-red-500' : p > 0 ? 'text-orange-500' : 'text-slate-600'
        return <span className={clsx('font-mono text-[11px]', p > 0 && 'font-semibold', c)}>{val}%</span>
      }

      case '_trend': {
        const delta = row._trendDelta
        if (delta == null) return <span className="font-mono text-[10px] text-slate-500">— no prev</span>
        const c = delta > 5 ? 'text-green-600' : delta > 0 ? 'text-green-600/70' : delta === 0 ? 'text-slate-600' : delta > -5 ? 'text-orange-500' : 'text-red-500'
        const arrow = delta > 5 ? '▲' : delta > 0 ? '↗' : delta === 0 ? '→' : delta > -5 ? '↘' : '▼'
        const str   = delta > 0 ? `+${delta}pp` : `${delta}pp`
        return <span className={clsx('font-mono text-[11px] font-semibold', c)}>{arrow} {str}</span>
      }

      case 'RCA_Summary':
        return val
          ? <span className="text-[11px] text-slate-900 font-medium leading-relaxed line-clamp-2">{val}</span>
          : <span className="text-slate-400">—</span>

      case 'Agentic_RCA':
        return val
          ? <span className="text-[11px] text-slate-900 font-medium leading-relaxed line-clamp-3">{val}</span>
          : <span className="text-slate-400">—</span>

      default:
        return val ? <span className="text-slate-900 font-medium">{val}</span> : <span className="text-slate-400">—</span>
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="mb-5 stagger stagger-1">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-display text-slate-900">Alert Center</h2>
            <p className="text-xs text-slate-800 mt-0.5 font-mono font-medium">
              {colFiltered.length} of {alerts.length} alerts · Triage, analyze, and dispatch
            </p>
          </div>
        </div>
      </div>

      {/* Priority Quick Stats */}
      <div className="flex items-center gap-3 mb-4 stagger stagger-2">
        {Object.entries(PRI).map(([key, { label, dot }]) => (
          <button
            key={key}
            onClick={() => setPriFilter(priFilter === key ? 'all' : key)}
            className={clsx(
              'glass-inner px-4 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all duration-200',
              priFilter === key ? 'ring-1 ring-blue-600/25 bg-blue-50' : 'hover:bg-slate-50'
            )}
          >
            <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', dot)} />
            <span className="text-[9px] font-mono font-bold text-slate-700">{key}</span>
            <span className="text-xs font-semibold text-slate-900">{label}</span>
            <span className="text-sm font-bold text-slate-950 font-mono">{priCounts[key]}</span>
          </button>
        ))}
        {priFilter !== 'all' && (
          <button onClick={() => setPriFilter('all')} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Send Communication Panel (Restricted to Senders) */}
      {userRole !== 'receiver' && (
        <div className="panel-featured p-5 mb-4 stagger stagger-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Send Communication</h3>
                <p className="text-[10px] text-slate-600 font-mono">Dispatch alerts via Power Automate integration</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSendMode('auto')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    sendMode === 'auto' ? 'bg-green-100 text-green-600 ring-1 ring-sage/20' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Zap className="w-3 h-3" />
                  Automatic
                </button>
                <button
                  onClick={() => { setSendMode('manual'); setSelected(new Set()); }}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    sendMode === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Radio className="w-3 h-3" />
                  Manual
                </button>
              </div>
              <button onClick={handleSend} className="btn-primary flex items-center gap-2 text-xs">
                <Send className="w-3 h-3" />
                {sendMode === 'auto' ? 'Dispatch All P1+P2' : `Send Selected (${selected.size})`}
              </button>
            </div>
          </div>
          {sendMode === 'manual' && selected.size > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600">
              <Radio className="w-3 h-3 text-blue-600" />
              {selected.size} alert{selected.size !== 1 ? 's' : ''} selected
              <button onClick={() => setSelected(new Set())} className="ml-2 text-slate-500 hover:text-slate-600 underline transition-colors">
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2.5 mb-3 flex-wrap stagger stagger-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search ID, SKU, site, alert..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-dark pl-9 w-52"
          />
        </div>
        <select value={priFilter} onChange={e => { setPriFilter(e.target.value); setPage(1) }} className="select-dark">
          <option value="all">All Priorities</option>
          {Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{k} - {v.label}</option>)}
        </select>
        <select value={alertTypeFilter} onChange={e => { setAlertTypeFilter(e.target.value); setPage(1) }} className="select-dark">
          <option value="all">All Types</option>
          {alertTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={siteTypeFilter} onChange={e => { setSiteTypeFilter(e.target.value); setSiteFilter('all'); setPage(1) }} className="select-dark">
          <option value="all">All Site Types</option>
          <option value="Factory">Factory</option>
          <option value="DC">DC</option>
        </select>
        <select value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1) }} className="select-dark">
          <option value="all">All Sites ({availableSites.length})</option>
          {availableSites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={skuFilter} onChange={e => { setSkuFilter(e.target.value); setPage(1) }} className="select-dark">
          <option value="all">All SKUs</option>
          {skus.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={weekFilter} onChange={e => { setWeekFilter(e.target.value); setPage(1) }} className="select-dark">
          <option value="all">All Weeks</option>
          {weeks.map(w => <option key={w} value={String(w)}>Week {w}</option>)}
        </select>
        {(activeTopFilterCount > 0 || activeColFilterCount > 0) && (
          <button
            onClick={() => { resetTopFilters(); clearAllColFilters() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100/50 transition-colors ml-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Pagination + Controls Bar */}
      <div className="flex items-center justify-between mb-2 text-[11px] font-mono text-slate-500">
        {/* Left: row count + page size */}
        <div className="flex items-center gap-3">
          <span className="text-slate-800 font-medium">
            {totalRows === 0 ? 'No rows' : `${((safePage - 1) * pageSize) + 1}–${Math.min(safePage * pageSize, totalRows)} of ${totalRows.toLocaleString()} rows`}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-slate-600 font-medium text-[10px]">Show</span>
            {PAGE_SIZES.map(s => (
              <button
                key={s}
                onClick={() => { setPageSize(s); setPage(1) }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer',
                  s === pageSize ? 'border-blue-300 bg-blue-50 text-blue-600 font-bold' : 'border-slate-200 text-slate-500 hover:text-slate-600'
                )}
              >{s}</button>
            ))}
          </div>
          {activeColFilterCount > 0 && (
            <button
              onClick={clearAllColFilters}
              className="px-2.5 py-0.5 rounded text-[10px] border border-orange-500/20 bg-orange-500/8 text-orange-500 font-bold cursor-pointer hover:bg-orange-500/12 transition-colors"
            >
              Clear {activeColFilterCount} column filter{activeColFilterCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
        {/* Right: nav + jump + column toggle */}
        <div className="flex items-center gap-1.5">
          {[['«', 1], ['‹', safePage - 1]].map(([lbl, target], i) => {
            const disabled = target < 1 || target === safePage
            return (
              <button key={i} onClick={() => setPage(target)} disabled={disabled}
                className={clsx('w-7 h-7 flex items-center justify-center rounded-lg border text-[12px] transition-colors',
                  disabled ? 'border-slate-200 text-slate-400 cursor-default' : 'border-slate-300 text-slate-600 hover:border-slate-300 cursor-pointer')}>
                {lbl}
              </button>
            )
          })}
          <span className="px-2 text-slate-500">{safePage}/{totalPages}</span>
          {[['›', safePage + 1], ['»', totalPages]].map(([lbl, target], i) => {
            const disabled = target > totalPages || target === safePage
            return (
              <button key={i} onClick={() => setPage(target)} disabled={disabled}
                className={clsx('w-7 h-7 flex items-center justify-center rounded-lg border text-[12px] transition-colors',
                  disabled ? 'border-slate-200 text-slate-400 cursor-default' : 'border-slate-300 text-slate-600 hover:border-slate-300 cursor-pointer')}>
                {lbl}
              </button>
            )
          })}
          <input
            placeholder="#"
            className="w-10 text-center px-1 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-600 focus:border-blue-300 focus:outline-none"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const p = parseInt(e.target.value)
                if (p >= 1 && p <= totalPages) setPage(p)
                e.target.value = ''
              }
            }}
          />
          {/* Column visibility */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowColToggle(v => !v)}
              title="Show/hide columns"
              className={clsx(
                'w-7 h-7 flex items-center justify-center rounded-lg border transition-all cursor-pointer',
                visibleCols.size < ALL_COLS.length
                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600'
              )}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            {showColToggle && (
              <ColumnToggleDropdown
                visibleCols={visibleCols}
                setVisibleCols={setVisibleCols}
                onClose={() => setShowColToggle(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-20" style={{ background: '#f1f5f9' }}>
              <tr className="border-b border-slate-200">
                {sendMode === 'manual' && (
                  <th className="w-10 px-3 py-3 border-b border-slate-200">
                    <input
                      type="checkbox"
                      checked={selected.size === paged.length && paged.length > 0}
                      onChange={() => {
                        if (selected.size === paged.length) setSelected(new Set())
                        else setSelected(new Set(paged.map(a => a.Alert_ID)))
                      }}
                      className="w-3.5 h-3.5 rounded border-slate-300 bg-white"
                      style={{ accentColor: '#c8a669' }}
                    />
                  </th>
                )}
                {activeCols.map(col => {
                  const isSorted   = sortField === col.key
                  const hasFilter  = !!colFilters[col.key]
                  return (
                    <th key={col.key} className={clsx('px-3 py-3 text-left select-none whitespace-nowrap border-b border-slate-200', col.wide && 'min-w-[140px]')}>
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => handleSort(col.key)}
                          className={clsx(
                            'text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors',
                            isSorted ? 'text-blue-600' : 'text-slate-700 hover:text-slate-900 font-extrabold'
                          )}
                        >
                          {col.label}
                          {isSorted && <span className="ml-1 text-[9px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                        </span>
                        {col.filterable && (
                          <span
                            onClick={(e) => handleColFilterClick(col.key, e)}
                            className={clsx(
                              'cursor-pointer text-[11px] px-0.5 py-px rounded transition-colors leading-none',
                              hasFilter ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
                              openColFilter === col.key && 'bg-slate-100'
                            )}
                            title="Filter column"
                          >▼</span>
                        )}
                      </div>
                      {hasFilter && <div className="h-px bg-gold/35 mt-1 rounded-full" />}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={activeCols.length + (sendMode === 'manual' ? 1 : 0)} className="py-16 text-center">
                    <div className="text-3xl mb-3 text-slate-600">◎</div>
                    <div className="text-sm font-semibold text-slate-800">No alerts match filters</div>
                    <div className="text-xs text-slate-600 mt-1">Try clearing some filters</div>
                  </td>
                </tr>
              ) : paged.map((row) => (
                <tr
                  key={`${row.Alert_ID}-${row.Week_Index}`}
                  onClick={() => { if (sendMode !== 'manual') setSelectedRow(row) }}
                  className={clsx(
                    'border-b border-slate-100 transition-colors',
                    sendMode === 'manual' && selected.has(row.Alert_ID) ? 'bg-blue-50' : 'hover:bg-slate-50',
                    sendMode !== 'manual' && 'cursor-pointer'
                  )}
                >
                  {sendMode === 'manual' && (
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.Alert_ID)}
                        onChange={() => toggleSelect(row.Alert_ID)}
                        className="w-3.5 h-3.5 rounded border-slate-300 bg-white"
                        style={{ accentColor: '#c8a669' }}
                      />
                    </td>
                  )}
                  {activeCols.map(col => (
                    <td key={col.key} className={clsx('px-3 py-2.5 text-slate-900', col.wide && 'max-w-[260px]')}>
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Filter Dropdown */}
      {openColFilter && (
        <ColumnFilterDropdown
          colKey={openColFilter}
          rows={enrichedAlerts}
          colFilters={colFilters}
          setColFilters={(fn) => { setColFilters(fn); setPage(1) }}
          anchorRect={filterAnchor}
          onClose={() => setOpenColFilter(null)}
        />
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="panel-featured px-5 py-3.5 flex items-center gap-3 shadow-xl">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Dispatched Successfully</p>
              <p className="text-[11px] text-slate-500">{toastMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Row Detail Drawer */}
      {selectedRow && <AlertRowDetail row={selectedRow} onClose={() => setSelectedRow(null)} />}

      {/* Alert Preview Modal */}
      {showPreview && (
        <AlertPreviewModal
          alerts={enrichedAlerts.filter(a => selected.has(a.Alert_ID))}
          onConfirm={handlePreviewConfirm}
          onDiscard={handlePreviewDiscard}
        />
      )}
    </div>
  )
}
