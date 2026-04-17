import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'

const FALLBACK_URLS = {
  pivot: '/data/pivot_visualization.csv',
  projection: '/data/projection_results.csv',
  triage: null,
}

async function fetchCSV(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`)
  const text = await res.text()
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    })
  })
}

async function fetchManifest() {
  const res = await fetch('/data/manifest.json', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load /data/manifest.json (${res.status})`)
  }
  return res.json()
}

function getRoleUrl(manifest, role, fallbackUrl) {
  const roleValue = manifest?.roles?.[role]
  if (typeof roleValue === 'string') return roleValue
  if (roleValue?.url) return roleValue.url
  return fallbackUrl
}

export default function useData(refreshTrigger = 0) {
  const [pivotData, setPivotData] = useState(null)
  const [flatData, setFlatData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        let manifest = null
        try {
          manifest = await fetchManifest()
        } catch {
          manifest = null
        }

        const urls = {
          pivot: getRoleUrl(manifest, 'pivot', FALLBACK_URLS.pivot),
          projection: getRoleUrl(manifest, 'projection', FALLBACK_URLS.projection),
          triage: getRoleUrl(manifest, 'triage', FALLBACK_URLS.triage),
        }

        if (!urls.pivot || !urls.projection) {
          throw new Error('Missing required data files. Run npm run setup after generating the CSV output.')
        }

        const [pivot, flat, triage = []] = await Promise.all([
          fetchCSV(urls.pivot),
          fetchCSV(urls.projection),
          urls.triage ? fetchCSV(urls.triage) : Promise.resolve([]),
        ])

        const triageLookup = {}
        for (const r of triage) {
          const key = `${r.SKU}|${r.Site}|${r.Week}`
          const pct = parseFloat(String(r['Shortage/Excess %']).replace('%', '')) || 0
          if (!triageLookup[key]) triageLookup[key] = {}
          if (String(r['Alert Type']).includes('MSTN')) triageLookup[key].mstn = pct
          if (String(r['Alert Type']).includes('ESTN')) triageLookup[key].estn = pct
        }

        const mergedFlat = flat.map((r) => {
          const key = `${r.SKU}|${r.Site}|${r.Week_Index}`
          const t = triageLookup[key]
          if (!t) return r
          return {
            ...r,
            ...(t.mstn !== undefined ? { 'MSTN%': t.mstn } : {}),
            ...(t.estn !== undefined ? { 'ESTN%': t.estn } : {}),
          }
        })

        setPivotData(pivot)
        setFlatData(mergedFlat)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [refreshTrigger])

  const factorySites = useMemo(() => {
    if (!pivotData) return new Set()
    return new Set(pivotData.filter((r) => r['Site Type'] === 'Factory').map((r) => r.Site))
  }, [pivotData])

  const dcFlatData = useMemo(() => {
    if (!flatData) return null
    return flatData.filter((r) => !factorySites.has(r.Site))
  }, [flatData, factorySites])

  const derived = useMemo(() => {
    if (!dcFlatData) return null

    const skus = [...new Set(dcFlatData.map((r) => r.SKU))].sort()
    const sites = [...new Set(dcFlatData.map((r) => r.Site))].sort()
    const alerts = dcFlatData.filter((r) => r.Priority && r.Priority !== 'None' && r.Alert_ID)

    const alertsByPriority = { P1: 0, P2: 0, P3: 0 }
    for (const a of alerts) {
      if (alertsByPriority[a.Priority] !== undefined) alertsByPriority[a.Priority]++
    }

    return { skus, sites, alerts, alertsByPriority, totalAlerts: alerts.length }
  }, [dcFlatData])

  return { pivotData, flatData, dcFlatData, derived, loading, error }
}
