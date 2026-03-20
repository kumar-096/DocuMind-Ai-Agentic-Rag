import { useEffect, useState } from "react"
import { getSettings, updateSettings } from "../lib/api"

export default function SettingsPage() {

  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (err) {
      console.error("SETTINGS LOAD ERROR:", err)
      setError("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      await updateSettings(settings)
      alert("Settings saved")
    } catch (err) {
      console.error(err)
      alert("Failed to save settings")
    }
  }

  // 🔴 HANDLE LOADING
  if (loading) {
    return <div className="text-white">Loading settings...</div>
  }

  // 🔴 HANDLE ERROR
  if (error) {
    return <div className="text-red-400">{error}</div>
  }

  // 🔴 CRITICAL: HANDLE NULL
  if (!settings) {
    return <div className="text-red-400">No settings found</div>
  }

  return (
    <div className="p-6 max-w-xl mx-auto text-white">

      <h1 className="text-xl mb-4">Settings</h1>

      <label>Top K</label>
      <input
        type="number"
        value={settings.top_k}
        onChange={(e) =>
          setSettings({ ...settings, top_k: Number(e.target.value) })
        }
        className="w-full p-2 bg-slate-800 mb-4"
      />

      <label>Temperature</label>
      <input
        type="text"
        value={settings.temperature}
        onChange={(e) =>
          setSettings({ ...settings, temperature: e.target.value })
        }
        className="w-full p-2 bg-slate-800 mb-4"
      />

      <button
        onClick={handleSave}
        className="bg-blue-600 px-4 py-2 rounded"
      >
        Save
      </button>

    </div>
  )
}