import { useOfflineStatus } from '../hooks/useOfflineStatus'

export default function OfflineIndicator() {
  const isOnline = useOfflineStatus()

  if (isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-green-400" />
        Online
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      Offline — tutte le funzionalit&agrave; disponibili
    </div>
  )
}
