import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '@/hooks/settings/useSettings'
import { listPrompts, getPromptContent, updatePrompt } from '@/api/prompts'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const VALID_TABS = new Set(['notifications', 'ai', 'rotation', 'status', 'prompts'])

export default function SettingsPage() {
  const {
    notificationSettings,
    setNotificationSettings,
    aiSettings,
    setAiSettings,
    rotationSettings,
    setRotationSettings,
    systemStatus,
    isLoading,
    isSaving,
    isReady,
    error,
    refreshStatus,
    saveNotificationSettings,
    saveAiSettings,
    saveRotationSettings,
    testAiConnection,
  } = useSettings()

  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('ai')

  // Prompt state
  const [promptFiles, setPromptFiles] = useState<string[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [promptContent, setPromptContent] = useState('')
  const [isPromptLoading, setIsPromptLoading] = useState(false)
  const [isPromptSaving, setIsPromptSaving] = useState(false)
  const [promptError, setPromptError] = useState<string | null>(null)

  // Handle URL query param for tab
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && VALID_TABS.has(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Load prompts when switching to prompts tab
  useEffect(() => {
    if (activeTab === 'prompts') {
      fetchPrompts()
    }
  }, [activeTab])

  // Load prompt content when selected prompt changes
  useEffect(() => {
    if (!selectedPrompt) {
      setPromptContent('')
      return
    }
    localStorage.setItem('lastSelectedPrompt', selectedPrompt)
    setIsPromptLoading(true)
    setPromptError(null)
    getPromptContent(selectedPrompt)
      .then((data) => setPromptContent(data.content))
      .catch((e: Error) => setPromptError(e.message || '加载 Prompt 内容失败'))
      .finally(() => setIsPromptLoading(false))
  }, [selectedPrompt])

  async function fetchPrompts() {
    setIsPromptLoading(true)
    setPromptError(null)
    try {
      const files = await listPrompts()
      setPromptFiles(files)
      if (selectedPrompt && files.includes(selectedPrompt)) return
      const lastSelected = localStorage.getItem('lastSelectedPrompt')
      if (lastSelected && files.includes(lastSelected)) {
        setSelectedPrompt(lastSelected)
        return
      }
      setSelectedPrompt(files[0] || null)
    } catch (e) {
      setPromptError((e as Error).message || '加载 Prompt 列表失败')
    } finally {
      setIsPromptLoading(false)
    }
  }

  async function handleSaveNotifications() {
    try {
      await saveNotificationSettings(notificationSettings)
      toast({ title: '通知设置已保存' })
    } catch (e) {
      toast({ title: '通知设置保存失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function handleSaveAi() {
    try {
      await saveAiSettings(aiSettings)
      toast({ title: 'AI 设置已保存' })
    } catch (e) {
      toast({ title: 'AI 设置保存失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function handleSaveRotation() {
    try {
      await saveRotationSettings(rotationSettings)
      toast({ title: '轮换设置已保存' })
    } catch (e) {
      toast({ title: '轮换设置保存失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function handleTestAi() {
    try {
      const res = await testAiConnection(aiSettings)
      toast({ title: 'AI 连接测试完成', description: res.message })
    } catch (e) {
      toast({ title: 'AI 连接测试失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function handleSavePrompt() {
    if (!selectedPrompt) {
      toast({ title: '请选择 Prompt 文件', variant: 'destructive' })
      return
    }
    setIsPromptSaving(true)
    try {
      const res = await updatePrompt(selectedPrompt, promptContent)
      toast({ title: 'Prompt 保存成功', description: res.message })
    } catch (e) {
      toast({ title: 'Prompt 保存失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsPromptSaving(false)
    }
  }

  // Helper to update nested notification settings
  function updateNotif(key: string, value: string | boolean) {
    setNotificationSettings((prev) => ({ ...prev, [key]: value }))
  }

  function updateAi(key: string, value: string) {
    setAiSettings((prev) => ({ ...prev, [key]: value }))
  }

  function updateRotation(key: string, value: string | boolean | number) {
    setRotationSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <h1 className="mb-6 text-xl md:text-2xl font-bold text-foreground">系统设置</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ai">AI 模型</TabsTrigger>
          <TabsTrigger value="rotation">IP 轮换</TabsTrigger>
          <TabsTrigger value="notifications">通知推送</TabsTrigger>
          <TabsTrigger value="status">系统状态</TabsTrigger>
          <TabsTrigger value="prompts">Prompt 管理</TabsTrigger>
        </TabsList>

        {/* AI Tab */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI 模型设置</CardTitle>
              <CardDescription>配置用于商品分析的大语言模型。</CardDescription>
            </CardHeader>
            {isReady ? (
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>API Base URL</Label>
                  <Input
                    value={aiSettings.OPENAI_BASE_URL || ''}
                    onChange={(e) => updateAi('OPENAI_BASE_URL', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={aiSettings.OPENAI_API_KEY || ''}
                    onChange={(e) => updateAi('OPENAI_API_KEY', e.target.value)}
                    placeholder="留空表示不修改"
                  />
                  <p className="text-xs text-muted-foreground">
                    {systemStatus?.env_file.openai_api_key_set ? '已配置' : '未配置'}，为安全起见不回显。
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>模型名称</Label>
                  <Input
                    value={aiSettings.OPENAI_MODEL_NAME || ''}
                    onChange={(e) => updateAi('OPENAI_MODEL_NAME', e.target.value)}
                    placeholder="gpt-3.5-turbo"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>代理地址 (可选)</Label>
                  <Input
                    value={aiSettings.PROXY_URL || ''}
                    onChange={(e) => updateAi('PROXY_URL', e.target.value)}
                    placeholder="http://127.0.0.1:7890"
                  />
                </div>
              </CardContent>
            ) : (
              <CardContent className="py-8 text-sm text-muted-foreground">
                正在加载 AI 配置...
              </CardContent>
            )}
            {isReady && (
              <CardFooter className="flex gap-2">
                <Button variant="outline" onClick={handleTestAi} disabled={isSaving}>测试连接</Button>
                <Button onClick={handleSaveAi} disabled={isSaving}>保存 AI 设置</Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Rotation Tab */}
        <TabsContent value="rotation">
          <Card>
            <CardHeader>
              <CardTitle>IP 代理轮换</CardTitle>
              <CardDescription>配置代理池与轮换策略。</CardDescription>
            </CardHeader>
            {isReady ? (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">代理轮换</h3>
                    <p className="text-sm text-muted-foreground">使用代理池进行 IP 轮换。</p>
                  </div>
                  <Switch
                    checked={rotationSettings.PROXY_ROTATION_ENABLED || false}
                    onCheckedChange={(val) => updateRotation('PROXY_ROTATION_ENABLED', val)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>轮换模式</Label>
                  <Select
                    value={rotationSettings.PROXY_ROTATION_MODE || 'per_task'}
                    onValueChange={(val) => updateRotation('PROXY_ROTATION_MODE', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择轮换模式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_task">按任务固定</SelectItem>
                      <SelectItem value="on_failure">失败后轮换</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>代理池 (逗号分隔)</Label>
                  <Textarea
                    value={rotationSettings.PROXY_POOL || ''}
                    onChange={(e) => updateRotation('PROXY_POOL', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="http://127.0.0.1:7890,socks5://127.0.0.1:1080"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>重试上限</Label>
                    <Input
                      type="number"
                      value={rotationSettings.PROXY_ROTATION_RETRY_LIMIT ?? ''}
                      onChange={(e) => updateRotation('PROXY_ROTATION_RETRY_LIMIT', Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>黑名单 TTL (秒)</Label>
                    <Input
                      type="number"
                      value={rotationSettings.PROXY_BLACKLIST_TTL ?? ''}
                      onChange={(e) => updateRotation('PROXY_BLACKLIST_TTL', Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="py-8 text-sm text-muted-foreground">
                正在加载轮换配置...
              </CardContent>
            )}
            {isReady && (
              <CardFooter className="flex gap-2">
                <Button onClick={handleSaveRotation} disabled={isSaving}>保存轮换设置</Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知推送设置</CardTitle>
              <CardDescription>配置爬虫任务完成后的消息推送渠道。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Bark URL (iOS)</Label>
                <Input
                  value={notificationSettings.BARK_URL || ''}
                  onChange={(e) => updateNotif('BARK_URL', e.target.value)}
                  placeholder="https://api.day.app/YOUR_KEY/"
                />
              </div>
              <div className="grid gap-2">
                <Label>Ntfy Topic URL</Label>
                <Input
                  value={notificationSettings.NTFY_TOPIC_URL || ''}
                  onChange={(e) => updateNotif('NTFY_TOPIC_URL', e.target.value)}
                  placeholder="https://ntfy.sh/topic"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Gotify URL</Label>
                  <Input
                    value={notificationSettings.GOTIFY_URL || ''}
                    onChange={(e) => updateNotif('GOTIFY_URL', e.target.value)}
                    placeholder="https://gotify.example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Gotify Token</Label>
                  <Input
                    value={notificationSettings.GOTIFY_TOKEN || ''}
                    onChange={(e) => updateNotif('GOTIFY_TOKEN', e.target.value)}
                    placeholder="Token"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>企业微信 Bot URL</Label>
                <Input
                  value={notificationSettings.WX_BOT_URL || ''}
                  onChange={(e) => updateNotif('WX_BOT_URL', e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Telegram Bot Token</Label>
                  <Input
                    value={notificationSettings.TELEGRAM_BOT_TOKEN || ''}
                    onChange={(e) => updateNotif('TELEGRAM_BOT_TOKEN', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telegram Chat ID</Label>
                  <Input
                    value={notificationSettings.TELEGRAM_CHAT_ID || ''}
                    onChange={(e) => updateNotif('TELEGRAM_CHAT_ID', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-4 border-t pt-4">
                <div className="grid gap-2">
                  <Label>通用 Webhook URL</Label>
                  <Input
                    value={notificationSettings.WEBHOOK_URL || ''}
                    onChange={(e) => updateNotif('WEBHOOK_URL', e.target.value)}
                    placeholder="https://your-webhook-url.com/endpoint"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Webhook 方法</Label>
                    <Select
                      value={notificationSettings.WEBHOOK_METHOD || 'POST'}
                      onValueChange={(val) => updateNotif('WEBHOOK_METHOD', val)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Webhook 内容类型</Label>
                    <Select
                      value={notificationSettings.WEBHOOK_CONTENT_TYPE || 'JSON'}
                      onValueChange={(val) => updateNotif('WEBHOOK_CONTENT_TYPE', val)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JSON">JSON</SelectItem>
                        <SelectItem value="FORM">FORM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Webhook 请求头 (JSON)</Label>
                  <Textarea
                    value={notificationSettings.WEBHOOK_HEADERS || ''}
                    onChange={(e) => updateNotif('WEBHOOK_HEADERS', e.target.value)}
                    placeholder='例如: {"Authorization": "Bearer token"}'
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Webhook Query 参数 (JSON)</Label>
                  <Textarea
                    value={notificationSettings.WEBHOOK_QUERY_PARAMETERS || ''}
                    onChange={(e) => updateNotif('WEBHOOK_QUERY_PARAMETERS', e.target.value)}
                    placeholder='例如: {"param1": "value1"}'
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Webhook Body (支持变量)</Label>
                  <Textarea
                    value={notificationSettings.WEBHOOK_BODY || ''}
                    onChange={(e) => updateNotif('WEBHOOK_BODY', e.target.value)}
                    placeholder='例如: {"message": "${content}"}'
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <Switch
                  id="pcurl"
                  checked={notificationSettings.PCURL_TO_MOBILE || false}
                  onCheckedChange={(val) => updateNotif('PCURL_TO_MOBILE', val)}
                />
                <Label htmlFor="pcurl">将商品链接转换为手机端链接</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} disabled={isSaving}>保存通知设置</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>系统运行状态</CardTitle>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={refreshStatus} disabled={isLoading}>刷新状态</Button>
              </div>
            </CardHeader>
            <CardContent>
              {systemStatus ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="font-medium">爬虫进程</h3>
                      <p className="text-sm text-muted-foreground">当前是否有任务正在执行抓取</p>
                    </div>
                    <span
                      className={
                        systemStatus.scraper_running
                          ? 'rounded-full bg-green-50 px-3 py-1 font-bold text-green-600'
                          : 'rounded-full bg-muted px-3 py-1 text-muted-foreground'
                      }
                    >
                      {systemStatus.scraper_running ? '运行中' : '空闲'}
                    </span>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">环境变量配置</h3>
                        <p className="text-sm text-muted-foreground">检查 .env 配置文件中的关键项</p>
                      </div>
                      <span
                        className={
                          systemStatus.env_file.exists
                            ? 'rounded-full bg-green-50 px-3 py-1 font-bold text-green-600'
                            : 'rounded-full bg-red-50 px-3 py-1 font-bold text-red-600'
                        }
                      >
                        {systemStatus.env_file.exists ? '已加载' : '缺失'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div
                        className={`rounded-lg border p-3 ${
                          systemStatus.env_file.openai_api_key_set
                            ? 'border-green-200 bg-green-50'
                            : 'border-yellow-200 bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">OpenAI API Key</span>
                          <span
                            className={`text-xs font-bold ${
                              systemStatus.env_file.openai_api_key_set ? 'text-green-700' : 'text-yellow-700'
                            }`}
                          >
                            {systemStatus.env_file.openai_api_key_set ? '已配置' : '未配置'}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`rounded-lg border p-3 ${
                          systemStatus.env_file.ntfy_topic_url_set ||
                          systemStatus.env_file.gotify_url_set ||
                          systemStatus.env_file.bark_url_set
                            ? 'border-green-200 bg-green-50'
                            : 'border-muted bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">通知渠道</span>
                          <span
                            className={`text-xs font-bold ${
                              systemStatus.env_file.ntfy_topic_url_set ||
                              systemStatus.env_file.gotify_url_set ||
                              systemStatus.env_file.bark_url_set
                                ? 'text-green-700'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {systemStatus.env_file.ntfy_topic_url_set ||
                            systemStatus.env_file.gotify_url_set ||
                            systemStatus.env_file.bark_url_set
                              ? '已配置'
                              : '未配置'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {[
                            systemStatus.env_file.ntfy_topic_url_set ? 'Ntfy' : '',
                            systemStatus.env_file.gotify_url_set ? 'Gotify' : '',
                            systemStatus.env_file.bark_url_set ? 'Bark' : '',
                          ]
                            .filter(Boolean)
                            .join(', ') || '无'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">正在获取系统状态...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts">
          <Card>
            <CardHeader>
              <CardTitle>Prompt 管理</CardTitle>
              <CardDescription>在线编辑 prompts 目录下的 Prompt 文件。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {promptError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {promptError}
                </div>
              )}

              <div className="grid gap-2">
                <Label>选择 Prompt 文件</Label>
                <Select
                  value={selectedPrompt || undefined}
                  onValueChange={setSelectedPrompt}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择一个 Prompt 文件..." />
                  </SelectTrigger>
                  <SelectContent>
                    {promptFiles.map((file) => (
                      <SelectItem key={file} value={file}>
                        {file}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {promptFiles.length === 0 && !isPromptLoading && (
                  <p className="text-sm text-muted-foreground">没有找到 Prompt 文件。</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Prompt 内容</Label>
                <Textarea
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  className="min-h-[240px]"
                  disabled={!selectedPrompt || isPromptLoading}
                  placeholder="请选择一个 Prompt 文件进行编辑..."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={isPromptSaving || !selectedPrompt} onClick={handleSavePrompt}>
                {isPromptSaving ? '保存中...' : '保存更改'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
