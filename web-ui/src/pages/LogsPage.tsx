import { useState, useEffect, useRef, useCallback } from 'react'
import { useLogs } from '@/hooks/logs/useLogs'
import { useTasks } from '@/hooks/tasks/useTasks'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function LogsPage() {
  const { tasks } = useTasks()
  const {
    logs,
    isAutoRefresh,
    clearLogs,
    toggleAutoRefresh,
    fetchLogs,
    setTaskId,
    loadLatest,
    loadPrevious,
    isFetchingHistory,
    hasMoreHistory,
  } = useLogs()
  const { toast } = useToast()

  const logContainerRef = useRef<HTMLPreElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const isPrependingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const lastScrollHeightRef = useRef(0)
  const prevLogsRef = useRef(logs)

  // Auto-select first/running task
  useEffect(() => {
    if (!tasks.length) {
      setSelectedTaskId('')
      setTaskId(null)
      return
    }
    if (selectedTaskId && tasks.some((t) => String(t.id) === selectedTaskId)) {
      return
    }
    const running = tasks.find((t) => t.is_running)
    const fallback = tasks[0]
    if (!fallback) {
      setSelectedTaskId('')
      setTaskId(null)
      return
    }
    setSelectedTaskId(String(running ? running.id : fallback.id))
  }, [tasks])

  // When selectedTaskId changes, update hook
  useEffect(() => {
    const resolvedId = selectedTaskId ? Number(selectedTaskId) : null
    setTaskId(resolvedId)
    if (resolvedId) {
      loadLatest(50)
    }
  }, [selectedTaskId, setTaskId, loadLatest])

  // Auto-scroll on new logs
  useEffect(() => {
    if (isPrependingRef.current) {
      const container = logContainerRef.current
      if (container) {
        const delta = container.scrollHeight - lastScrollHeightRef.current
        container.scrollTop = lastScrollTopRef.current + delta
      }
      isPrependingRef.current = false
      prevLogsRef.current = logs
      return
    }
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
    prevLogsRef.current = logs
  }, [logs, autoScroll])

  const handleScroll = useCallback(async () => {
    const container = logContainerRef.current
    if (!container) return
    if (!hasMoreHistory || isFetchingHistory) return
    if (container.scrollTop > 120) return

    lastScrollTopRef.current = container.scrollTop
    lastScrollHeightRef.current = container.scrollHeight
    isPrependingRef.current = true
    await loadPrevious(50)
  }, [hasMoreHistory, isFetchingHistory, loadPrevious])

  async function handleClearLogs() {
    try {
      await clearLogs()
      toast({ title: '日志已清空' })
    } catch (e) {
      toast({ title: '清空日志失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsClearDialogOpen(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">运行日志</h1>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">任务</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="请选择任务" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={String(task.id)}>
                    {task.task_name}{task.is_running ? '（运行中）' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled={!selectedTaskId} onClick={fetchLogs}>
            刷新
          </Button>

          <div className="flex items-center space-x-2">
            <Switch id="auto-refresh" checked={isAutoRefresh} onCheckedChange={toggleAutoRefresh} />
            <Label htmlFor="auto-refresh">自动刷新</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
            <Label htmlFor="auto-scroll">自动滚动</Label>
          </div>

          <Button variant="destructive" size="sm" disabled={!selectedTaskId} onClick={() => setIsClearDialogOpen(true)}>
            清空日志
          </Button>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="relative flex-1 p-0">
          <pre
            ref={logContainerRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-auto whitespace-pre-wrap break-all bg-gray-950 p-4 font-mono text-sm text-gray-100"
          >
            {logs || '暂无日志输出...'}
          </pre>
        </CardContent>
      </Card>

      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>清空任务日志</DialogTitle>
            <DialogDescription>此操作不可恢复，确定要清空当前任务日志吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleClearLogs}>确认清空</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
