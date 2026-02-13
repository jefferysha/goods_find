import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  type AccountItem,
} from '@/api/accounts'
import { useToast } from '@/hooks/use-toast'
import { getAllPlatforms } from '@/lib/platforms'
import { PlatformTabs } from '@/components/common/PlatformBadge'
import { Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

// ─── Platform Guides ─────────────────────────────────────────
// 各平台的接入教程/预告信息
interface PlatformGuide {
  title: string
  description: string
  steps?: string[]
  extensionUrl?: string
  websiteUrl?: string
  /** 预告信息 (未启用平台) */
  preview?: {
    method: string
    difficulty: string
    eta?: string
  }
}

const PLATFORM_GUIDES: Record<string, PlatformGuide> = {
  xianyu: {
    title: '获取闲鱼 Cookie',
    description: '使用 Chrome 扩展提取闲鱼登录状态 JSON，粘贴到下方添加账号。',
    steps: [
      '安装闲鱼登录状态提取扩展',
      '打开并登录闲鱼官网 (goofish.com)',
      '点击扩展图标，选择"提取登录状态"，再点击"复制到剪贴板"',
      '回到本页，点击"添加账号"，粘贴 JSON 内容并保存',
      '如果配置多账号，不要在当前窗口退出闲鱼，可新开无痕窗口登录其他账号',
    ],
    extensionUrl: 'https://chromewebstore.google.com/detail/xianyu-login-state-extrac/eidlpfjiodpigmfcahkmlenhppfklcoa',
    websiteUrl: 'https://www.goofish.com',
  },
  zhuanzhuan: {
    title: '转转账号接入',
    description: '转转平台的商品监控即将支持。',
    preview: {
      method: '通过浏览器 Cookie 提取转转登录态，与闲鱼类似。转转使用微信授权登录，需在 PC 端浏览器中扫码登录后提取。',
      difficulty: '中等 — 需要微信扫码授权',
      eta: '规划中',
    },
  },
  jd_used: {
    title: '京东二手接入',
    description: '京东二手优品的商品监控即将支持。',
    preview: {
      method: '通过京东账号 Cookie 提取。京东有较完善的反爬机制，可能需要配合代理轮换使用。',
      difficulty: '较高 — 反爬机制较强',
      eta: '规划中',
    },
  },
  pdd_used: {
    title: '拼多多二手接入',
    description: '拼多多二手频道的商品监控即将支持。',
    preview: {
      method: '拼多多主要通过移动端操作，PC 端接入需要使用移动端模拟或 API 对接方式。',
      difficulty: '较高 — 以移动端为主',
      eta: '规划中',
    },
  },
  taobao_used: {
    title: '淘宝二手接入',
    description: '淘宝二手市场的商品监控即将支持。',
    preview: {
      method: '与闲鱼同属阿里系，使用淘宝/阿里账号 Cookie。接入方式与闲鱼类似，预计复用大部分逻辑。',
      difficulty: '较低 — 可复用闲鱼经验',
      eta: '规划中',
    },
  },
}

// ─── Xianyu Guide Card ──────────────────────────────────────
function XianyuGuideCard() {
  const guide = PLATFORM_GUIDES.xianyu
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: '#FF6600' }}
          >
            鱼
          </span>
          {guide.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <ol className="list-inside list-decimal space-y-1">
          <li>
            安装{' '}
            <a className="text-blue-600 hover:underline" href={guide.extensionUrl} target="_blank" rel="noopener noreferrer">
              闲鱼登录状态提取扩展
            </a>
          </li>
          <li>
            打开并登录{' '}
            <a className="text-blue-600 hover:underline" href={guide.websiteUrl} target="_blank" rel="noopener noreferrer">
              闲鱼官网
            </a>
          </li>
          {guide.steps?.slice(2).map((step, idx) => (
            <li key={idx}>{step}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

// ─── Platform Preview Card (未启用平台) ─────────────────────
function PlatformPreviewCard({ platformId }: { platformId: string }) {
  const guide = PLATFORM_GUIDES[platformId]
  const platforms = getAllPlatforms()
  const platform = platforms.find((p) => p.id === platformId)

  if (!guide?.preview || !platform) return null

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
        style={{ backgroundColor: platform.color }}
      >
        {platform.name.charAt(0)}
      </div>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{guide.title}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{guide.description}</p>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-sm">接入方式预告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              接入方式
            </span>
            <p className="text-muted-foreground">{guide.preview.method}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              接入难度
            </span>
            <p className="text-muted-foreground">{guide.preview.difficulty}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              预计进度
            </span>
            <p className="text-muted-foreground">{guide.preview.eta}</p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        该平台尚未启用，敬请期待后续更新。
      </p>
    </div>
  )
}

// ─── Xianyu Account Section ─────────────────────────────────
function XianyuAccountSection() {
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  const [deleteName, setDeleteName] = useState('')

  async function fetchAccounts() {
    setIsLoading(true)
    try {
      setAccounts(await listAccounts())
    } catch (e) {
      toast({ title: '加载账号失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  function openCreateDialog() {
    setNewName('')
    setNewContent('')
    setIsCreateDialogOpen(true)
  }

  async function openEditDialog(name: string) {
    setIsSaving(true)
    try {
      const detail = await getAccount(name)
      setEditName(detail.name)
      setEditContent(detail.content)
      setIsEditDialogOpen(true)
    } catch (e) {
      toast({ title: '加载账号内容失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  function openDeleteDialog(name: string) {
    setDeleteName(name)
    setIsDeleteDialogOpen(true)
  }

  function goCreateTask(name: string) {
    navigate(`/tasks?account=${encodeURIComponent(name)}&create=1`)
  }

  async function handleCreateAccount() {
    if (!newName.trim() || !newContent.trim()) {
      toast({ title: '信息不完整', description: '请填写账号名称并粘贴 JSON 内容。', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      await createAccount({ name: newName.trim(), content: newContent.trim() })
      toast({ title: '账号已添加' })
      setIsCreateDialogOpen(false)
      await fetchAccounts()
    } catch (e) {
      toast({ title: '添加账号失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateAccount() {
    if (!editContent.trim()) {
      toast({ title: '内容不能为空', description: '请粘贴 JSON 内容。', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      await updateAccount(editName, editContent.trim())
      toast({ title: '账号已更新' })
      setIsEditDialogOpen(false)
      await fetchAccounts()
    } catch (e) {
      toast({ title: '更新账号失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setIsSaving(true)
    try {
      await deleteAccount(deleteName)
      toast({ title: '账号已删除' })
      setIsDeleteDialogOpen(false)
      await fetchAccounts()
    } catch (e) {
      toast({ title: '删除账号失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Guide */}
      <XianyuGuideCard />

      {/* Account List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>闲鱼账号列表</CardTitle>
              <CardDescription>账号文件保存在 state/ 目录下，可绑定到任务。</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>+ 添加账号</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>账号名称</TableHead>
                <TableHead>状态文件</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">暂无账号，请先按照上方教程添加</TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.name}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{account.path}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => goCreateTask(account.name)}>创建任务</Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(account.name)}>更新</Button>
                        <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(account.name)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>添加闲鱼账号</DialogTitle>
            <DialogDescription>粘贴通过 Chrome 插件提取的 JSON 内容。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>账号名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：acc_1" />
            </div>
            <div className="grid gap-2">
              <Label>JSON 内容</Label>
              <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} className="min-h-[200px] font-mono text-xs" placeholder="请粘贴登录状态 JSON..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>取消</Button>
            <Button disabled={isSaving} onClick={handleCreateAccount}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>更新账号：{editName}</DialogTitle>
            <DialogDescription>替换账号的登录状态 JSON。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>JSON 内容</Label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[200px] font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>取消</Button>
            <Button disabled={isSaving} onClick={handleUpdateAccount}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除账号</DialogTitle>
            <DialogDescription>确认删除账号 {deleteName} 吗？该操作不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" disabled={isSaving} onClick={handleDeleteAccount}>
              {isSaving ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Accounts Page ──────────────────────────────────────────
export default function AccountsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState('xianyu')

  const allPlatforms = useMemo(() => getAllPlatforms(), [])

  const platformTabData = useMemo(
    () =>
      allPlatforms.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        enabled: p.enabled,
        count: undefined, // No count for accounts tabs
      })),
    [allPlatforms],
  )

  // For accounts page, allow clicking on disabled platforms to show preview
  const handlePlatformChange = (id: string) => {
    setSelectedPlatform(id === 'all' ? 'xianyu' : id)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">账号管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理各平台的登录状态，账号可绑定到监控任务。
          </p>
        </div>
      </div>

      {/* Platform Tabs - allow clicking disabled ones for preview */}
      <div className="mb-6">
        <AccountPlatformTabs
          platforms={platformTabData}
          value={selectedPlatform}
          onChange={handlePlatformChange}
        />
      </div>

      {/* Platform Content */}
      {selectedPlatform === 'xianyu' ? (
        <XianyuAccountSection />
      ) : (
        <PlatformPreviewCard platformId={selectedPlatform} />
      )}
    </div>
  )
}

// ─── Custom Platform Tabs (allows clicking disabled) ────────
// 特殊版本的 PlatformTabs，未启用的平台也可以点击（用于查看预告）
function AccountPlatformTabs({
  platforms,
  value,
  onChange,
}: {
  platforms: Array<{ id: string; name: string; color: string; enabled: boolean }>
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onChange(platform.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
            value === platform.id
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
          }`}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: platform.color, opacity: platform.enabled ? 1 : 0.4 }}
          />
          <span style={{ opacity: platform.enabled ? 1 : 0.6 }}>
            {platform.name}
          </span>
          {!platform.enabled && value !== platform.id && (
            <span className="rounded-sm bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
              即将支持
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
