import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Square, Pencil, Trash2 } from 'lucide-react'
import { useTasks } from '@/hooks/tasks/useTasks'
import { listAccounts, type AccountItem } from '@/api/accounts'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getAllPlatforms } from '@/lib/platforms'
import { PlatformBadge } from '@/components/common/PlatformBadge'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { Task, TaskGenerateRequest, TaskUpdate } from '@/types/task'

// ─── Task Form ───────────────────────────────────────────────
interface TaskFormProps {
  mode: 'create' | 'edit'
  initialData?: Task | null
  accountOptions: AccountItem[]
  defaultAccount?: string
  onSubmit: (data: TaskGenerateRequest | TaskUpdate) => void
}

function TaskForm({ mode, initialData, accountOptions, defaultAccount, onSubmit }: TaskFormProps) {
  const [taskName, setTaskName] = useState('')
  const [keyword, setKeyword] = useState('')
  const [description, setDescription] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [maxPages, setMaxPages] = useState(3)
  const [cron, setCron] = useState('')
  const [accountStateFile, setAccountStateFile] = useState('')
  const [personalOnly, setPersonalOnly] = useState(true)
  const [freeShipping, setFreeShipping] = useState(true)
  const [newPublishOption, setNewPublishOption] = useState('__none__')
  const [region, setRegion] = useState('')
  const [platform, setPlatform] = useState('xianyu')

  const platforms = getAllPlatforms()

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setTaskName(initialData.task_name || '')
      setKeyword(initialData.keyword || '')
      setDescription(initialData.description || '')
      setMinPrice(initialData.min_price || '')
      setMaxPrice(initialData.max_price || '')
      setMaxPages(initialData.max_pages || 3)
      setCron(initialData.cron || '')
      setAccountStateFile(initialData.account_state_file || '')
      setPersonalOnly(initialData.personal_only ?? true)
      setFreeShipping(initialData.free_shipping ?? true)
      setNewPublishOption(initialData.new_publish_option || '__none__')
      setRegion(initialData.region || '')
      setPlatform(initialData.platform || 'xianyu')
    } else {
      setTaskName('')
      setKeyword('')
      setDescription('')
      setMinPrice('')
      setMaxPrice('')
      setMaxPages(3)
      setCron('')
      setAccountStateFile(defaultAccount || '')
      setPersonalOnly(true)
      setFreeShipping(true)
      setNewPublishOption('__none__')
      setRegion('')
      setPlatform('xianyu')
    }
  }, [mode, initialData, defaultAccount])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    let normalizedRegion = region
      .trim()
      .split('/')
      .map((part) => part.trim().replace(/(省|市)$/u, ''))
      .filter((part) => part.length > 0)
      .join('/')

    const data: Record<string, unknown> = {
      task_name: taskName,
      keyword,
      description,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
      max_pages: maxPages,
      cron: cron || undefined,
      account_state_file: accountStateFile || null,
      personal_only: personalOnly,
      free_shipping: freeShipping,
      new_publish_option: newPublishOption === '__none__' ? '' : newPublishOption,
      region: normalizedRegion,
      platform,
    }
    onSubmit(data as unknown as TaskGenerateRequest)
  }

  return (
    <form id="task-form" onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">目标平台</Label>
          <div className="sm:col-span-3">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={!p.enabled}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.name}</span>
                      {!p.enabled && (
                        <span className="text-[10px] text-muted-foreground">(即将支持)</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">任务名称</Label>
          <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="sm:col-span-3" placeholder="例如：索尼 A7M4 相机" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">搜索关键词</Label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="sm:col-span-3" placeholder="例如：a7m4" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">详细需求</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:col-span-3"
            placeholder="请用自然语言详细描述你的购买需求，AI将根据此描述生成分析标准..."
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">价格范围</Label>
          <div className="sm:col-span-3 flex items-center gap-2">
            <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="最低价" />
            <span>-</span>
            <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="最高价" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">搜索页数</Label>
          <Input type="number" value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} className="sm:col-span-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">定时规则</Label>
          <Input value={cron} onChange={(e) => setCron(e.target.value)} className="sm:col-span-3" placeholder="分 时 日 月 周 (例如: 0 8 * * *)" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">绑定账号</Label>
          <div className="sm:col-span-3">
            <Select value={accountStateFile || '__none__'} onValueChange={(v) => setAccountStateFile(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="未绑定（自动选择）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">未绑定（自动选择）</SelectItem>
                {accountOptions.map((account) => (
                  <SelectItem key={account.path} value={account.path}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">仅个人卖家</Label>
          <Switch checked={personalOnly} onCheckedChange={setPersonalOnly} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">是否包邮</Label>
          <Switch checked={freeShipping} onCheckedChange={setFreeShipping} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">新发布范围</Label>
          <div className="sm:col-span-3">
            <Select value={newPublishOption} onValueChange={setNewPublishOption}>
              <SelectTrigger>
                <SelectValue placeholder="不筛选（默认）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">不筛选（默认）</SelectItem>
                <SelectItem value="最新">最新</SelectItem>
                <SelectItem value="1天内">1天内</SelectItem>
                <SelectItem value="3天内">3天内</SelectItem>
                <SelectItem value="7天内">7天内</SelectItem>
                <SelectItem value="14天内">14天内</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
          <Label className="sm:text-right">区域筛选</Label>
          <div className="sm:col-span-3 space-y-1">
            <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="例如：浙江/杭州/滨江区 或 上海/徐汇区" />
            <p className="text-xs text-muted-foreground">区域筛选会导致满足条件的商品数量很少</p>
          </div>
        </div>
      </div>
    </form>
  )
}

// ─── Tasks Page ──────────────────────────────────────────────
export default function TasksPage() {
  const {
    tasks,
    isLoading,
    error,
    removeTask,
    createTask,
    updateTask,
    startTask,
    stopTask,
    stoppingTaskIds,
  } = useTasks()

  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCriteriaDialogOpen, setIsCriteriaDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [criteriaTask, setCriteriaTask] = useState<Task | null>(null)
  const [criteriaDescription, setCriteriaDescription] = useState('')
  const [isCriteriaSubmitting, setIsCriteriaSubmitting] = useState(false)
  const [taskToDeleteId, setTaskToDeleteId] = useState<number | null>(null)
  const [accountOptions, setAccountOptions] = useState<AccountItem[]>([])
  const [defaultAccountPath, setDefaultAccountPath] = useState('')

  const taskToDelete = taskToDeleteId !== null ? tasks.find((t) => t.id === taskToDeleteId) || null : null

  // Fetch account options
  useEffect(() => {
    listAccounts()
      .then(setAccountOptions)
      .catch((e: Error) => {
        toast({ title: '加载账号列表失败', description: e.message, variant: 'destructive' })
      })
  }, [toast])

  // Handle URL query params
  useEffect(() => {
    const accountName = searchParams.get('account') || ''
    if (accountName && accountOptions.length > 0) {
      const match = accountOptions.find((a) => a.name === accountName)
      setDefaultAccountPath(match ? match.path : '')
    } else {
      setDefaultAccountPath('')
    }
    if (searchParams.get('create') === '1') {
      setIsCreateDialogOpen(true)
    }
  }, [searchParams, accountOptions])

  const handleDeleteTask = (taskId: number) => {
    setTaskToDeleteId(taskId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) {
      toast({ title: '未找到要删除的任务', variant: 'destructive' })
      setIsDeleteDialogOpen(false)
      return
    }
    try {
      await removeTask(taskToDelete.id)
      toast({ title: '任务已删除' })
    } catch (e) {
      toast({ title: '删除任务失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsDeleteDialogOpen(false)
      setTaskToDeleteId(null)
    }
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsEditDialogOpen(true)
  }

  const handleCreateTask = async (data: TaskGenerateRequest | TaskUpdate) => {
    setIsSubmitting(true)
    try {
      await createTask(data as TaskGenerateRequest)
      setIsCreateDialogOpen(false)
    } catch (e) {
      toast({ title: '创建任务失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateTask = async (data: TaskGenerateRequest | TaskUpdate) => {
    if (!selectedTask) return
    setIsSubmitting(true)
    try {
      await updateTask(selectedTask.id, data as TaskUpdate)
      setIsEditDialogOpen(false)
    } catch (e) {
      toast({ title: '更新任务失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenCriteriaDialog = (task: Task) => {
    setCriteriaTask(task)
    setCriteriaDescription(task.description || '')
    setIsCriteriaDialogOpen(true)
  }

  const handleRefreshCriteria = async () => {
    if (!criteriaTask) return
    if (!criteriaDescription.trim()) {
      toast({ title: '详细需求不能为空', variant: 'destructive' })
      return
    }
    setIsCriteriaSubmitting(true)
    try {
      await updateTask(criteriaTask.id, { description: criteriaDescription })
      setIsCriteriaDialogOpen(false)
    } catch (e) {
      toast({ title: '重新生成失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsCriteriaSubmitting(false)
    }
  }

  const handleStartTask = async (taskId: number) => {
    try {
      await startTask(taskId)
    } catch (e) {
      toast({ title: '启动任务失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleStopTask = async (taskId: number) => {
    try {
      await stopTask(taskId)
    } catch (e) {
      toast({ title: '停止任务失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleToggleEnabled = useCallback(
    async (task: Task, enabled: boolean) => {
      try {
        await updateTask(task.id, { enabled })
      } catch (e) {
        toast({ title: '更新状态失败', description: (e as Error).message, variant: 'destructive' })
      }
    },
    [updateTask, toast],
  )

  return (
    <div>
      <div className="mb-4 md:mb-6 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">任务管理</h1>
        <Button size="sm" className="md:size-default" onClick={() => setIsCreateDialogOpen(true)}>+ 创建新任务</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <strong className="font-bold">出错了! </strong>
          <span>{error.message}</span>
        </div>
      )}

      {/* 移动端：卡片列表 */}
      <div className="space-y-3 md:hidden">
        {isLoading && tasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">正在加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">没有找到任何任务。</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              {/* 卡片头部：名称 + 状态 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{task.task_name}</span>
                    <PlatformBadge platformId={task.platform || 'xianyu'} size="sm" />
                    <Badge
                      variant={task.is_running ? 'default' : 'secondary'}
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        task.is_running
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0'
                          : 'bg-amber-100 text-amber-700 border-0',
                      )}
                    >
                      {task.is_running ? '运行中' : '已停止'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    关键词: <span className="font-mono">{task.keyword}</span>
                  </p>
                </div>
                <Switch
                  checked={task.enabled}
                  onCheckedChange={(val) => handleToggleEnabled(task, val)}
                />
              </div>

              {/* 卡片信息行 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>价格: <strong className="text-foreground">{task.min_price || '不限'} - {task.max_price || '不限'}</strong></span>
                <span>页数: <strong className="text-foreground">{task.max_pages || 3}</strong></span>
                <span>定时: <strong className="text-foreground">{task.cron || '手动'}</strong></span>
              </div>

              {/* 卡片操作区 */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                {!task.is_running ? (
                  <Button
                    size="sm"
                    className={cn(
                      'h-8 flex-1',
                      task.enabled
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted',
                    )}
                    disabled={!task.enabled}
                    onClick={() => handleStartTask(task.id)}
                  >
                    <Play className="mr-1 h-3 w-3 fill-current" /> 运行
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 flex-1"
                    disabled={stoppingTaskIds.has(task.id)}
                    onClick={() => handleStopTask(task.id)}
                  >
                    {stoppingTaskIds.has(task.id) ? '停止中...' : <><Square className="mr-1 h-3 w-3 fill-current" /> 停止</>}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8" onClick={() => handleOpenCriteriaDialog(task)}>
                  AI标准
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" title="编辑" onClick={() => handleEditTask(task)}>
                  <Pencil className="h-3.5 w-3.5 text-blue-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="删除" onClick={() => handleDeleteTask(task.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 桌面端：表格 */}
      <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[84px] text-center">启用</TableHead>
              <TableHead>任务</TableHead>
              <TableHead className="text-center">平台</TableHead>
              <TableHead className="text-center">状态</TableHead>
              <TableHead className="text-center">价格范围</TableHead>
              <TableHead className="text-center">最大页数</TableHead>
              <TableHead className="text-center">AI 标准</TableHead>
              <TableHead className="text-center">定时规则</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  正在加载中...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  没有找到任何任务。
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="text-center">
                    <Switch
                      checked={task.enabled}
                      onCheckedChange={(val) => handleToggleEnabled(task, val)}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{task.task_name}</span>
                        <Badge variant="outline" className="text-xs">关键词</Badge>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono">{task.keyword}</span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <PlatformBadge platformId={task.platform || 'xianyu'} size="md" />
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge
                      variant={task.is_running ? 'default' : 'secondary'}
                      className={cn(
                        task.is_running
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0'
                          : 'bg-amber-100 text-amber-700 border-0',
                      )}
                    >
                      {task.is_running ? '运行中' : '已停止'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-sm font-semibold">
                      {task.min_price || '不限'} - {task.max_price || '不限'}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="inline-flex h-10 w-12 items-center justify-center rounded-md bg-muted text-base font-semibold">
                      {task.max_pages || 3}
                    </span>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="max-w-[170px] truncate rounded-md bg-muted px-2 py-1 text-xs font-mono" title={task.ai_prompt_criteria_file || '暂无标准文件'}>
                        {(task.ai_prompt_criteria_file || 'N/A').replace('prompts/', '')}
                      </span>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => handleOpenCriteriaDialog(task)}>
                        重新生成
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-sm font-medium">{task.cron || '手动触发'}</span>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!task.is_running ? (
                        <Button
                          size="sm"
                          className={cn(
                            'min-w-[86px]',
                            task.enabled
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted',
                          )}
                          disabled={!task.enabled}
                          onClick={() => handleStartTask(task.id)}
                        >
                          <Play className="mr-1 h-3 w-3 fill-current" /> 运行
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="min-w-[86px]"
                          disabled={stoppingTaskIds.has(task.id)}
                          onClick={() => handleStopTask(task.id)}
                        >
                          {stoppingTaskIds.has(task.id) ? (
                            '停止中...'
                          ) : (
                            <>
                              <Square className="mr-1 h-3 w-3 fill-current" /> 停止
                            </>
                          )}
                        </Button>
                      )}

                      <div className="mx-1 h-4 w-px bg-border" />

                      <Button size="icon" variant="ghost" title="编辑" onClick={() => handleEditTask(task)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>

                      <Button size="icon" variant="ghost" title="删除" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建新监控任务 (AI驱动)</DialogTitle>
            <DialogDescription>
              请填写任务详情。AI将根据你的"详细需求"自动生成分析标准。
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            mode="create"
            accountOptions={accountOptions}
            defaultAccount={defaultAccountPath}
            onSubmit={handleCreateTask}
          />
          <DialogFooter>
            <Button type="submit" form="task-form" disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑任务: {selectedTask?.task_name}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <TaskForm
              mode="edit"
              initialData={selectedTask}
              accountOptions={accountOptions}
              onSubmit={handleUpdateTask}
            />
          )}
          <DialogFooter>
            <Button type="submit" form="task-form" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refresh Criteria Dialog */}
      <Dialog open={isCriteriaDialogOpen} onOpenChange={setIsCriteriaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>重新生成 AI 标准</DialogTitle>
            <DialogDescription>修改详细需求后将重新生成 AI 分析标准。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label className="text-sm font-medium">详细需求</Label>
            <Textarea
              value={criteriaDescription}
              onChange={(e) => setCriteriaDescription(e.target.value)}
              className="min-h-[140px]"
              placeholder="请用自然语言详细描述你的购买需求，AI将根据此描述生成分析标准..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCriteriaDialogOpen(false)}>取消</Button>
            <Button disabled={isCriteriaSubmitting} onClick={handleRefreshCriteria}>
              {isCriteriaSubmitting ? '生成中...' : '重新生成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>删除任务</DialogTitle>
            <DialogDescription>
              {taskToDelete
                ? `确定删除任务「${taskToDelete.task_name}」吗？此操作不可恢复。`
                : '确定删除该任务吗？此操作不可恢复。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteTask}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
