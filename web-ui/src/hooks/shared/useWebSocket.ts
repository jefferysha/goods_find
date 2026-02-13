import { useEffect } from 'react'
import { wsService } from '@/services/websocket'

export function useWebSocket(event: string, handler: (data: any) => void) {
  useEffect(() => {
    wsService.on(event, handler)
    return () => {
      wsService.off(event, handler)
    }
  }, [event, handler])
}
