import { createContext, useContext, useState } from 'react'

const AlertContext = createContext(null)

export function AlertProvider({ children }) {
  const [sendMode, setSendMode] = useState('auto')
  const [dispatchedIds, setDispatchedIds] = useState(new Set())

  const dispatch = async (ids) => {
    if (!ids || ids.length === 0) return

    const alertIdString = ids.join(';')
    const url = "https://defaultbdef8a20aaac4f80b3a0d9a32f99fd.33.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/233d3f1819224c219a272ddcb911ac3d/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=fMO27x3ImV60thVTVvGogN1c4BCZbyrPS8O7DJ-DUdk"

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "AlertID": alertIdString }),
        redirect: "follow"
      })
      const result = await response.text()
      console.log('Power Automate Dispatch Success:', result)
      setDispatchedIds(prev => new Set([...prev, ...ids]))
      return true
    } catch (error) {
      console.error('Power Automate Dispatch Error:', error)
      return false
    }
  }

  return (
    <AlertContext.Provider value={{ sendMode, setSendMode, dispatchedIds, dispatch }}>
      {children}
    </AlertContext.Provider>
  )
}

export const useAlertContext = () => {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlertContext must be used within AlertProvider')
  return ctx
}
