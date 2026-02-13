# 二手商品智能分析平台 — 全量实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将闲鱼监控机器人升级为二手商品智能分析平台：前端重构为 React + Three.js 登录页 + 溢价分析 + 数据仪表盘 + 智能提醒 + 历史追踪 + 收藏对比。

**Architecture:** 前端 React 18 SPA 通过 REST API + WebSocket 与 FastAPI 后端通信。后端新增 PricingService（溢价分析）、AlertService（智能提醒）、HistoryService（历史追踪）、FavoriteService（收藏对比）。数据存储从纯 JSONL 升级到 JSONL + SQLite（历史数据）。

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, Three.js, Recharts, Zustand, React Router, FastAPI, SQLite (aiosqlite), Pydantic

---

## Phase 1: 前端基础设施重构（React 迁移）

### Task 1: 初始化 React + Vite 项目

**Files:**
- Create: `web-ui-react/package.json`
- Create: `web-ui-react/vite.config.ts`
- Create: `web-ui-react/tsconfig.json`
- Create: `web-ui-react/tsconfig.app.json`
- Create: `web-ui-react/tsconfig.node.json`
- Create: `web-ui-react/index.html`
- Create: `web-ui-react/postcss.config.cjs`
- Create: `web-ui-react/tailwind.config.cjs`
- Create: `web-ui-react/components.json`

**Step 1: 创建 React + Vite 项目**

```bash
cd /Users/jiayin/Documents/code_manager/h-backend/ai-goofish-monitor
npm create vite@latest web-ui-react -- --template react-ts
cd web-ui-react
```

**Step 2: 安装核心依赖**

```bash
npm install react-router-dom@6 zustand three @react-three/fiber @react-three/drei recharts
npm install tailwindcss@3 postcss autoprefixer tailwindcss-animate
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/three @types/node
```

**Step 3: 初始化 Tailwind CSS**

```bash
npx tailwindcss init -p
```

配置 `tailwind.config.cjs`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 4: 初始化 shadcn/ui**

```bash
npx shadcn@latest init
```

选择: New York style, Zinc color, CSS variables: yes

**Step 5: 安装 shadcn/ui 基础组件**

```bash
npx shadcn@latest add button card input label select switch table tabs textarea toast badge dialog checkbox
```

**Step 6: 配置 Vite proxy**

创建 `web-ui-react/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
```

**Step 7: 验证项目启动**

```bash
cd web-ui-react && npm run dev
```

Expected: Vite dev server 启动成功，浏览器访问 http://localhost:5173 看到默认页面

**Step 8: Commit**

```bash
git add web-ui-react/
git commit -m "feat: init React + Vite + Tailwind + shadcn/ui project"
```

---

### Task 2: 基础设施层迁移（HTTP、WebSocket、工具函数、类型定义）

**Files:**
- Create: `web-ui-react/src/lib/utils.ts`
- Create: `web-ui-react/src/api/http.ts`
- Create: `web-ui-react/src/services/websocket.ts`
- Create: `web-ui-react/src/types/task.d.ts`
- Create: `web-ui-react/src/types/result.d.ts`
- Create: `web-ui-react/src/types/account.d.ts`
- Create: `web-ui-react/src/types/settings.d.ts`
- Create: `web-ui-react/src/types/pricing.d.ts`

**Step 1: 创建工具函数**

`web-ui-react/src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null || price === '') return '-'
  const num = typeof price === 'string'
    ? parseFloat(price.replace('¥', '').replace(',', '').trim())
    : price
  return isNaN(num) ? String(price) : `¥${num.toFixed(2)}`
}
```

**Step 2: 迁移 HTTP 客户端**

从 `web-ui/src/lib/http.ts` 迁移，将 Vue 的 `useAuth()` 替换为直接读 localStorage:

`web-ui-react/src/api/http.ts`:

```ts
interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export async function http(url: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers)

  let fullUrl = url
  if (options.params) {
    const searchParams = new URLSearchParams()
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      fullUrl += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  const config: RequestInit = { ...options, headers }
  const response = await fetch(fullUrl, config)

  if (response.status === 401) {
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_logged_in')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}
```

**Step 3: 迁移 WebSocket 服务**

直接复制 `web-ui/src/services/websocket.ts`，这是纯 TS 代码，无需修改。

**Step 4: 迁移类型定义**

直接复制以下文件:
- `web-ui/src/types/task.d.ts` → `web-ui-react/src/types/task.d.ts`
- `web-ui/src/types/result.d.ts` → `web-ui-react/src/types/result.d.ts`

新增 `web-ui-react/src/types/account.d.ts`:

```ts
export interface Account {
  name: string
  state_file: string
  status: 'valid' | 'expired' | 'unknown'
  last_check?: string
}
```

新增 `web-ui-react/src/types/settings.d.ts`:

```ts
export interface NotificationSettings {
  ntfy_topic_url: string
  bark_url: string
  wx_bot_url: string
  telegram_bot_token: string
  telegram_chat_id: string
  webhook_url: string
}

export interface AiSettings {
  openai_api_key: string
  openai_base_url: string
  openai_model_name: string
}

export interface ProxySettings {
  proxy_url: string
  proxy_rotation_enabled: boolean
  proxy_pool: string
}
```

新增 `web-ui-react/src/types/pricing.d.ts`:

```ts
export interface MarketPrice {
  id: string
  task_id: number
  keyword: string
  reference_price: number
  condition: 'new' | 'like_new' | 'good' | 'fair'
  note: string
  created_at: string
  updated_at: string
}

export interface BatchStats {
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  total_count: number
  percentile: number
}

export interface PriceAnalysis {
  item_id: string
  item_price: number
  reference_price: number | null
  premium_rate: number | null
  price_level: 'low_price' | 'fair' | 'slight_premium' | 'high_premium' | 'unknown'
  batch_stats: BatchStats
}

export interface PremiumThresholds {
  task_id: number | null
  low_price_max: number    // default: -15
  fair_max: number         // default: 5
  slight_premium_max: number // default: 20
}
```

**Step 5: 验证 TypeScript 编译**

```bash
cd web-ui-react && npx tsc --noEmit
```

Expected: 无错误

**Step 6: Commit**

```bash
git add web-ui-react/src/
git commit -m "feat: migrate infrastructure layer (http, websocket, types, utils)"
```

---

### Task 3: API 层迁移

**Files:**
- Create: `web-ui-react/src/api/tasks.ts`
- Create: `web-ui-react/src/api/results.ts`
- Create: `web-ui-react/src/api/accounts.ts`
- Create: `web-ui-react/src/api/logs.ts`
- Create: `web-ui-react/src/api/settings.ts`
- Create: `web-ui-react/src/api/prompts.ts`
- Create: `web-ui-react/src/api/pricing.ts`

**Step 1: 迁移所有 API 文件**

这些文件是纯 TypeScript 函数，直接从 `web-ui/src/api/` 复制，仅调整 import 路径:

`web-ui-react/src/api/tasks.ts` (示例):

```ts
import { http } from './http'
import type { Task, TaskUpdate, TaskGenerateRequest } from '@/types/task'

export async function fetchTasks(): Promise<Task[]> {
  return http('/api/tasks')
}

export async function fetchTask(id: number): Promise<Task> {
  return http(`/api/tasks/${id}`)
}

export async function createTask(data: Partial<Task>) {
  return http('/api/tasks/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function generateTask(data: TaskGenerateRequest) {
  return http('/api/tasks/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateTask(id: number, data: TaskUpdate) {
  return http(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteTask(id: number) {
  return http(`/api/tasks/${id}`, { method: 'DELETE' })
}

export async function startTask(id: number) {
  return http(`/api/tasks/start/${id}`, { method: 'POST' })
}

export async function stopTask(id: number) {
  return http(`/api/tasks/stop/${id}`, { method: 'POST' })
}
```

类似地迁移其余 API 文件。每个文件参考 `web-ui/src/api/` 对应源文件。

新增 `web-ui-react/src/api/pricing.ts`:

```ts
import { http } from './http'
import type { MarketPrice, PriceAnalysis, BatchStats, PremiumThresholds } from '@/types/pricing'

export async function fetchMarketPrices(taskId: number): Promise<MarketPrice[]> {
  return http('/api/pricing/market-prices', { params: { task_id: taskId } })
}

export async function createMarketPrice(data: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>) {
  return http('/api/pricing/market-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateMarketPrice(id: string, data: Partial<MarketPrice>) {
  return http(`/api/pricing/market-prices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteMarketPrice(id: string) {
  return http(`/api/pricing/market-prices/${id}`, { method: 'DELETE' })
}

export async function fetchPriceAnalysis(taskId: number, runId?: string): Promise<PriceAnalysis[]> {
  return http('/api/pricing/analysis', { params: { task_id: taskId, run_id: runId } })
}

export async function fetchBatchStats(taskId: number, runId?: string): Promise<BatchStats> {
  return http('/api/pricing/batch-stats', { params: { task_id: taskId, run_id: runId } })
}

export async function fetchThresholds(taskId?: number): Promise<PremiumThresholds> {
  return http('/api/pricing/thresholds', { params: { task_id: taskId } })
}

export async function updateThresholds(data: PremiumThresholds) {
  return http('/api/pricing/thresholds', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
```

**Step 2: 验证编译**

```bash
cd web-ui-react && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add web-ui-react/src/api/
git commit -m "feat: migrate API layer + add pricing API"
```

---

### Task 4: React Hooks 层（状态管理）

**Files:**
- Create: `web-ui-react/src/hooks/auth/useAuth.ts`
- Create: `web-ui-react/src/hooks/tasks/useTasks.ts`
- Create: `web-ui-react/src/hooks/results/useResults.ts`
- Create: `web-ui-react/src/hooks/logs/useLogs.ts`
- Create: `web-ui-react/src/hooks/settings/useSettings.ts`
- Create: `web-ui-react/src/hooks/pricing/usePricing.ts`
- Create: `web-ui-react/src/hooks/pricing/useMarketPrice.ts`
- Create: `web-ui-react/src/hooks/shared/useWebSocket.ts`
- Create: `web-ui-react/src/hooks/shared/useDebounce.ts`

**Step 1: 创建 useAuth hook**

从 `web-ui/src/composables/useAuth.ts` 转换:

```ts
// web-ui-react/src/hooks/auth/useAuth.ts
import { useState, useCallback } from 'react'
import { wsService } from '@/services/websocket'

const getStoredAuth = () => ({
  username: localStorage.getItem('auth_username'),
  isLoggedIn: localStorage.getItem('auth_logged_in') === 'true',
})

export function useAuth() {
  const [authState, setAuthState] = useState(getStoredAuth)

  const login = useCallback(async (user: string, pass: string): Promise<boolean> => {
    try {
      const response = await fetch('/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      })
      if (response.ok) {
        localStorage.setItem('auth_username', user)
        localStorage.setItem('auth_logged_in', 'true')
        setAuthState({ username: user, isLoggedIn: true })
        wsService.start()
        return true
      }
      return false
    } catch (e) {
      console.error('Login error', e)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_logged_in')
    setAuthState({ username: null, isLoggedIn: false })
    wsService.stop()
    window.location.href = '/login'
  }, [])

  return {
    username: authState.username,
    isAuthenticated: authState.isLoggedIn,
    login,
    logout,
  }
}
```

**Step 2: 创建其余 hooks**

每个 hook 按照对应的 Vue composable 转换。核心转换规则:
- `ref(x)` → `useState(x)`
- `computed(() => expr)` → `useMemo(() => expr, [deps])`
- `watch(source, callback)` → `useEffect(() => { callback() }, [source])`
- `onMounted(fn)` → `useEffect(() => { fn() }, [])`
- `onUnmounted(fn)` → `useEffect(() => () => { fn() }, [])`

参考 `web-ui/src/composables/` 中每个文件的逻辑进行转换。

**Step 3: 创建 usePricing hook（新增）**

```ts
// web-ui-react/src/hooks/pricing/usePricing.ts
import { useState, useCallback } from 'react'
import { fetchPriceAnalysis, fetchBatchStats } from '@/api/pricing'
import type { PriceAnalysis, BatchStats } from '@/types/pricing'

export function usePricing(taskId: number) {
  const [analyses, setAnalyses] = useState<PriceAnalysis[]>([])
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null)
  const [loading, setLoading] = useState(false)

  const loadAnalysis = useCallback(async (runId?: string) => {
    setLoading(true)
    try {
      const [analysisData, statsData] = await Promise.all([
        fetchPriceAnalysis(taskId, runId),
        fetchBatchStats(taskId, runId),
      ])
      setAnalyses(analysisData)
      setBatchStats(statsData)
    } catch (e) {
      console.error('Failed to load pricing analysis', e)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  return { analyses, batchStats, loading, loadAnalysis }
}
```

**Step 4: 创建 useMarketPrice hook（新增）**

```ts
// web-ui-react/src/hooks/pricing/useMarketPrice.ts
import { useState, useCallback } from 'react'
import {
  fetchMarketPrices, createMarketPrice, updateMarketPrice, deleteMarketPrice
} from '@/api/pricing'
import type { MarketPrice } from '@/types/pricing'

export function useMarketPrice(taskId: number) {
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMarketPrices(taskId)
      setPrices(data)
    } catch (e) {
      console.error('Failed to load market prices', e)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const add = useCallback(async (data: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>) => {
    await createMarketPrice(data)
    await load()
  }, [load])

  const update = useCallback(async (id: string, data: Partial<MarketPrice>) => {
    await updateMarketPrice(id, data)
    await load()
  }, [load])

  const remove = useCallback(async (id: string) => {
    await deleteMarketPrice(id)
    await load()
  }, [load])

  return { prices, loading, load, add, update, remove }
}
```

**Step 5: 验证编译**

```bash
cd web-ui-react && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add web-ui-react/src/hooks/
git commit -m "feat: create React hooks layer (auth, tasks, results, logs, settings, pricing)"
```

---

### Task 5: Three.js 赛博朋克登录页

**Files:**
- Create: `web-ui-react/src/components/login/CyberScene.tsx`
- Create: `web-ui-react/src/components/login/ParticleNetwork.tsx`
- Create: `web-ui-react/src/components/login/DataStream.tsx`
- Create: `web-ui-react/src/components/login/NeonGrid.tsx`
- Create: `web-ui-react/src/pages/LoginPage.tsx`

**设计方向（frontend-design skill）:**
- **风格:** 赛博朋克 / 科技感
- **色彩:** 深黑底 (#0a0a0f) + 青色霓虹 (#00fff5) + 品红 (#ff00aa) + 电蓝 (#0066ff)
- **字体:** "Orbitron" (display) + "JetBrains Mono" (body)
- **3D 场景:** 粒子网络（节点间有连线）+ 垂直数据流（类矩阵绿雨但改为青色）+ 底部霓虹网格
- **登录卡片:** 毛玻璃效果 (backdrop-blur) + 发光边框 + 打字机效果标题
- **交互:** 粒子跟随鼠标移动，输入时粒子加速

**Step 1: 创建 3D 粒子网络组件**

`web-ui-react/src/components/login/ParticleNetwork.tsx`:

```tsx
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 200
const CONNECTION_DISTANCE = 2.5
const MOUSE_INFLUENCE = 3

export function ParticleNetwork() {
  const meshRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const mouseRef = useRef(new THREE.Vector2(0, 0))
  const { viewport } = useThree()

  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }
    return { positions, velocities }
  }, [])

  // Line buffer for connections
  const linePositions = useMemo(() => {
    return new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6) // max connections
  }, [])

  useFrame(({ pointer }) => {
    if (!meshRef.current) return
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array

    mouseRef.current.set(pointer.x * viewport.width / 2, pointer.y * viewport.height / 2)

    // Update particle positions
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2
      positions[ix] += particles.velocities[ix]
      positions[iy] += particles.velocities[iy]
      positions[iz] += particles.velocities[iz]

      // Mouse attraction
      const dx = mouseRef.current.x - positions[ix]
      const dy = mouseRef.current.y - positions[iy]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < MOUSE_INFLUENCE) {
        positions[ix] += dx * 0.003
        positions[iy] += dy * 0.003
      }

      // Boundary wrap
      if (Math.abs(positions[ix]) > 10) particles.velocities[ix] *= -1
      if (Math.abs(positions[iy]) > 7) particles.velocities[iy] *= -1
      if (Math.abs(positions[iz]) > 5) particles.velocities[iz] *= -1
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true

    // Update line connections
    if (linesRef.current) {
      let lineIndex = 0
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const dx = positions[i * 3] - positions[j * 3]
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
          const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < CONNECTION_DISTANCE) {
            linePositions[lineIndex++] = positions[i * 3]
            linePositions[lineIndex++] = positions[i * 3 + 1]
            linePositions[lineIndex++] = positions[i * 3 + 2]
            linePositions[lineIndex++] = positions[j * 3]
            linePositions[lineIndex++] = positions[j * 3 + 1]
            linePositions[lineIndex++] = positions[j * 3 + 2]
          }
        }
      }
      linesRef.current.geometry.setDrawRange(0, lineIndex / 3)
      ;(linesRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    }
  })

  return (
    <>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particles.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.06} color="#00fff5" transparent opacity={0.8} sizeAttenuation />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00fff5" transparent opacity={0.15} />
      </lineSegments>
    </>
  )
}
```

**Step 2: 创建霓虹网格地面**

`web-ui-react/src/components/login/NeonGrid.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function NeonGrid() {
  const gridRef = useRef<THREE.GridHelper>(null)

  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.position.z = (clock.getElapsedTime() * 0.3) % 1
    }
  })

  return (
    <group position={[0, -5, 0]} rotation={[-Math.PI / 6, 0, 0]}>
      <gridHelper
        ref={gridRef}
        args={[40, 40, '#ff00aa', '#1a0033']}
      />
      {/* Glow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial color="#0a0010" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
```

**Step 3: 创建数据流效果**

`web-ui-react/src/components/login/DataStream.tsx`:

```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STREAM_COUNT = 60

export function DataStream() {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(STREAM_COUNT * 3)
    const spd = new Float32Array(STREAM_COUNT)
    for (let i = 0; i < STREAM_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = Math.random() * 14 - 7
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 3
      spd[i] = 0.02 + Math.random() * 0.06
    }
    return { positions: pos, speeds: spd }
  }, [])

  useFrame(() => {
    if (!meshRef.current) return
    const pos = meshRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < STREAM_COUNT; i++) {
      pos[i * 3 + 1] -= speeds[i]
      if (pos[i * 3 + 1] < -7) {
        pos[i * 3 + 1] = 7
        pos[i * 3] = (Math.random() - 0.5) * 20
      }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STREAM_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#ff00aa" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}
```

**Step 4: 组合 3D 场景**

`web-ui-react/src/components/login/CyberScene.tsx`:

```tsx
import { Canvas } from '@react-three/fiber'
import { ParticleNetwork } from './ParticleNetwork'
import { NeonGrid } from './NeonGrid'
import { DataStream } from './DataStream'

export function CyberScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 8, 25]} />
      <ambientLight intensity={0.3} />
      <ParticleNetwork />
      <DataStream />
      <NeonGrid />
    </Canvas>
  )
}
```

**Step 5: 创建登录页面**

`web-ui-react/src/pages/LoginPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CyberScene } from '@/components/login/CyberScene'
import { useAuth } from '@/hooks/auth/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [titleText, setTitleText] = useState('')
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const fullTitle = '二手商品智能分析平台'

  // Typewriter effect
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setTitleText(fullTitle.slice(0, i + 1))
      i++
      if (i >= fullTitle.length) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(searchParams.get('redirect') || '/tasks')
    }
  }, [isAuthenticated, navigate, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = await login(username, password)
    setLoading(false)
    if (success) {
      navigate(searchParams.get('redirect') || '/tasks')
    } else {
      setError('用户名或密码错误')
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Three.js Background */}
      <CyberScene />

      {/* Login Card */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="w-full max-w-md p-8 rounded-2xl
          bg-black/40 backdrop-blur-xl
          border border-cyan-500/20
          shadow-[0_0_40px_rgba(0,255,245,0.1),0_0_80px_rgba(255,0,170,0.05)]">

          {/* Title with typewriter */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text
              bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500"
              style={{ fontFamily: "'Orbitron', monospace" }}>
              {titleText}
              <span className="animate-pulse text-cyan-400">_</span>
            </h1>
            <p className="mt-2 text-sm text-cyan-500/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              SYSTEM ACCESS REQUIRED
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-cyan-300/80 text-xs tracking-widest uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                USER_ID
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/50 border-cyan-500/30 text-cyan-100
                  focus:border-cyan-400 focus:ring-cyan-400/30
                  placeholder:text-cyan-800"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-cyan-300/80 text-xs tracking-widest uppercase"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ACCESS_KEY
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/50 border-cyan-500/30 text-cyan-100
                  focus:border-cyan-400 focus:ring-cyan-400/30
                  placeholder:text-cyan-800"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ERROR: {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600
                hover:from-cyan-500 hover:to-blue-500
                text-white font-semibold tracking-wider
                shadow-[0_0_20px_rgba(0,255,245,0.3)]
                hover:shadow-[0_0_30px_rgba(0,255,245,0.5)]
                transition-all duration-300
                disabled:opacity-50"
              style={{ fontFamily: "'Orbitron', monospace" }}
            >
              {loading ? 'AUTHENTICATING...' : 'INITIALIZE →'}
            </Button>
          </form>

          {/* Decorative elements */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500/30" />
            <span className="text-[10px] text-cyan-600/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              v2.0.0 // SECURE
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-fuchsia-500/30" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 6: 在 index.html 中加载字体**

在 `web-ui-react/index.html` 的 `<head>` 中加入:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Step 7: 验证登录页面渲染**

```bash
cd web-ui-react && npm run dev
```

访问 http://localhost:5173/login，确认:
- Three.js 粒子网络正常渲染
- 数据流下落效果正常
- 霓虹网格可见
- 登录卡片毛玻璃效果正常
- 打字机动画正常
- 粒子跟随鼠标

**Step 8: Commit**

```bash
git add web-ui-react/src/components/login/ web-ui-react/src/pages/LoginPage.tsx web-ui-react/index.html
git commit -m "feat: create Three.js cyberpunk login page with particle network"
```

---

### Task 6: 布局组件与路由

**Files:**
- Create: `web-ui-react/src/components/layout/MainLayout.tsx`
- Create: `web-ui-react/src/components/layout/Sidebar/Sidebar.tsx`
- Create: `web-ui-react/src/components/layout/Sidebar/SidebarNav.tsx`
- Create: `web-ui-react/src/components/layout/Sidebar/SidebarNavItem.tsx`
- Create: `web-ui-react/src/components/layout/Header/Header.tsx`
- Create: `web-ui-react/src/components/layout/Header/HeaderUserMenu.tsx`
- Create: `web-ui-react/src/components/layout/Header/HeaderBreadcrumb.tsx`
- Create: `web-ui-react/src/app/routes.tsx`
- Create: `web-ui-react/src/app/providers.tsx`
- Modify: `web-ui-react/src/app/App.tsx`
- Modify: `web-ui-react/src/app/main.tsx`

**Step 1: 创建路由配置**

`web-ui-react/src/app/routes.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const AccountsPage = lazy(() => import('@/pages/AccountsPage'))
const ResultsPage = lazy(() => import('@/pages/ResultsPage'))
const LogsPage = lazy(() => import('@/pages/LogsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'))

function LazyWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <Outlet />
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = localStorage.getItem('auth_logged_in') === 'true'
  if (!isAuth) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={null}><LoginPage /></Suspense>,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/tasks" replace /> },
      {
        element: <LazyWrapper />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'accounts', element: <AccountsPage /> },
          { path: 'results', element: <ResultsPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
          { path: 'logs', element: <LogsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
```

**Step 2: 创建侧边栏组件**

参考 `web-ui/src/components/layout/TheSidebar.vue` 进行转换，使用 lucide-react 图标。

**Step 3: 创建顶栏组件**

参考 `web-ui/src/components/layout/TheHeader.vue` 进行转换。

**Step 4: 创建 MainLayout**

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar/Sidebar'
import { Header } from './Header/Header'

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**Step 5: 创建 App 和 main 入口**

**Step 6: 验证路由跳转**

```bash
cd web-ui-react && npm run dev
```

Expected: 未登录访问 `/tasks` 会重定向到 `/login`，登录后可以正常访问各页面

**Step 7: Commit**

```bash
git add web-ui-react/src/
git commit -m "feat: create layout components, routing, and page shells"
```

---

### Task 7: 核心业务页面迁移（Tasks, Accounts, Results, Logs, Settings）

**Files:**
- Create: `web-ui-react/src/pages/TasksPage.tsx`
- Create: `web-ui-react/src/components/tasks/TaskTable/TaskTable.tsx`
- Create: `web-ui-react/src/components/tasks/TaskTable/TaskTableRow.tsx`
- Create: `web-ui-react/src/components/tasks/TaskTable/TaskStatusBadge.tsx`
- Create: `web-ui-react/src/components/tasks/TaskForm/TaskForm.tsx`
- Create: `web-ui-react/src/components/tasks/TaskForm/TaskBasicFields.tsx`
- Create: `web-ui-react/src/components/tasks/TaskForm/TaskPriceFields.tsx`
- Create: `web-ui-react/src/components/tasks/TaskForm/TaskFilterFields.tsx`
- Create: `web-ui-react/src/components/tasks/TaskForm/TaskScheduleFields.tsx`
- Create: `web-ui-react/src/components/tasks/TaskForm/TaskAccountSelect.tsx`
- Create: `web-ui-react/src/components/tasks/TaskActions/TaskRunButton.tsx`
- Create: `web-ui-react/src/components/tasks/TaskActions/TaskDeleteDialog.tsx`
- 以及 accounts, results, logs, settings 对应组件

**Step 1: 逐页面转换**

从 `web-ui/src/views/` 的每个 `.vue` 文件转换为 React TSX。

核心转换规则:
- `<template>` → JSX return
- `v-if="cond"` → `{cond && (<.../>)}`
- `v-for="item in list"` → `{list.map(item => (<... key={item.id}/>))}`
- `v-model="value"` → `value={value} onChange={e => setValue(e.target.value)}`
- `@click="handler"` → `onClick={handler}`
- `<component :prop="value">` → `<Component prop={value}>`
- `<slot>` → `{children}`

每个 View 拆分为细粒度组件，如 `TasksView.vue`(345行) 拆为:
- `TasksPage.tsx` (页面壳, ~50行)
- `TaskTable.tsx` (~80行)
- `TaskTableRow.tsx` (~60行)
- `TaskStatusBadge.tsx` (~20行)
- `TaskForm.tsx` (~60行)
- 各 Field 组件 (~30行/个)

**Step 2: 逐页面验证**

每完成一个页面，在浏览器中验证功能正常。

**Step 3: Commit（按页面分多次提交）**

```bash
git commit -m "feat: migrate TasksPage with task table, form, and actions"
git commit -m "feat: migrate AccountsPage with account table and form"
git commit -m "feat: migrate ResultsPage with result grid and filters"
git commit -m "feat: migrate LogsPage with log viewer"
git commit -m "feat: migrate SettingsPage with all setting panels"
```

---

## Phase 2: 溢价分析功能

### Task 8: 后端 — 市场基准价模型与存储

**Files:**
- Create: `src/domain/models/market_price.py`
- Create: `src/domain/repositories/market_price_repository.py`
- Create: `src/infrastructure/persistence/json_market_price_repository.py`

**Step 1: 创建领域模型**

`src/domain/models/market_price.py`:

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class MarketPrice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: int
    keyword: str
    reference_price: float
    condition: str = "good"  # "new" | "like_new" | "good" | "fair"
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class MarketPriceCreate(BaseModel):
    task_id: int
    keyword: str
    reference_price: float
    condition: str = "good"
    note: str = ""

class MarketPriceUpdate(BaseModel):
    reference_price: Optional[float] = None
    condition: Optional[str] = None
    note: Optional[str] = None

class PremiumThresholds(BaseModel):
    task_id: Optional[int] = None
    low_price_max: float = -15.0
    fair_max: float = 5.0
    slight_premium_max: float = 20.0
```

**Step 2: 创建仓储接口**

`src/domain/repositories/market_price_repository.py`:

```python
from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models.market_price import MarketPrice

class MarketPriceRepository(ABC):
    @abstractmethod
    async def get_by_task_id(self, task_id: int) -> List[MarketPrice]: ...

    @abstractmethod
    async def get_by_id(self, id: str) -> Optional[MarketPrice]: ...

    @abstractmethod
    async def create(self, price: MarketPrice) -> MarketPrice: ...

    @abstractmethod
    async def update(self, id: str, data: dict) -> Optional[MarketPrice]: ...

    @abstractmethod
    async def delete(self, id: str) -> bool: ...
```

**Step 3: 创建 JSON 文件实现**

`src/infrastructure/persistence/json_market_price_repository.py`:

使用 `market_prices.json` 文件存储，实现所有 CRUD 方法。

**Step 4: 编写测试**

```bash
pytest tests/unit/test_market_price.py -v
```

**Step 5: Commit**

```bash
git commit -m "feat: add MarketPrice domain model, repository interface, and JSON persistence"
```

---

### Task 9: 后端 — 溢价分析服务

**Files:**
- Create: `src/services/pricing_service.py`
- Create: `src/domain/models/price_analysis.py`

**Step 1: 创建价格分析模型**

`src/domain/models/price_analysis.py`:

```python
from pydantic import BaseModel
from typing import Optional, List

class BatchStats(BaseModel):
    avg_price: float
    median_price: float
    min_price: float
    max_price: float
    total_count: int
    percentile: float = 0.0

class PriceAnalysis(BaseModel):
    item_id: str
    item_price: float
    reference_price: Optional[float] = None
    premium_rate: Optional[float] = None
    price_level: str = "unknown"  # low_price | fair | slight_premium | high_premium | unknown
    batch_stats: Optional[BatchStats] = None
```

**Step 2: 创建溢价分析服务**

`src/services/pricing_service.py`:

```python
import statistics
from typing import List, Optional
from src.domain.models.market_price import MarketPrice, PremiumThresholds
from src.domain.models.price_analysis import PriceAnalysis, BatchStats
from src.infrastructure.persistence.json_market_price_repository import JsonMarketPriceRepository

class PricingService:
    def __init__(self):
        self.repo = JsonMarketPriceRepository()

    def calculate_batch_stats(self, prices: List[float]) -> BatchStats:
        if not prices:
            return BatchStats(avg_price=0, median_price=0, min_price=0, max_price=0, total_count=0)
        return BatchStats(
            avg_price=round(statistics.mean(prices), 2),
            median_price=round(statistics.median(prices), 2),
            min_price=min(prices),
            max_price=max(prices),
            total_count=len(prices),
        )

    def calculate_premium_rate(self, item_price: float, reference_price: float) -> float:
        if reference_price <= 0:
            return 0.0
        return round((item_price - reference_price) / reference_price * 100, 2)

    def classify_price_level(self, premium_rate: float, thresholds: PremiumThresholds) -> str:
        if premium_rate < thresholds.low_price_max:
            return "low_price"
        elif premium_rate <= thresholds.fair_max:
            return "fair"
        elif premium_rate <= thresholds.slight_premium_max:
            return "slight_premium"
        else:
            return "high_premium"

    def calculate_percentile(self, price: float, all_prices: List[float]) -> float:
        if not all_prices:
            return 0.0
        below = sum(1 for p in all_prices if p < price)
        return round(below / len(all_prices) * 100, 2)

    async def analyze_batch(
        self,
        items: List[dict],
        task_id: int,
        thresholds: Optional[PremiumThresholds] = None
    ) -> List[PriceAnalysis]:
        if thresholds is None:
            thresholds = PremiumThresholds()

        market_prices = await self.repo.get_by_task_id(task_id)
        ref_price_map = {mp.condition: mp.reference_price for mp in market_prices}
        default_ref = ref_price_map.get("good") or (market_prices[0].reference_price if market_prices else None)

        all_prices = []
        for item in items:
            price_str = str(item.get("商品信息", {}).get("当前售价", "0")).replace("¥", "").replace(",", "").strip()
            try:
                all_prices.append(float(price_str))
            except (ValueError, TypeError):
                all_prices.append(0.0)

        batch_stats = self.calculate_batch_stats(all_prices)
        results = []

        for i, item in enumerate(items):
            item_price = all_prices[i]
            item_id = item.get("商品信息", {}).get("商品ID", str(i))

            ref = default_ref
            premium_rate = self.calculate_premium_rate(item_price, ref) if ref else None
            level = self.classify_price_level(premium_rate, thresholds) if premium_rate is not None else "unknown"

            item_batch_stats = BatchStats(
                **batch_stats.dict(),
                percentile=self.calculate_percentile(item_price, all_prices)
            )

            results.append(PriceAnalysis(
                item_id=item_id,
                item_price=item_price,
                reference_price=ref,
                premium_rate=premium_rate,
                price_level=level,
                batch_stats=item_batch_stats,
            ))

        return results
```

**Step 3: 编写测试**

**Step 4: Commit**

```bash
git commit -m "feat: add PricingService with batch analysis, premium rate, and price classification"
```

---

### Task 10: 后端 — 溢价分析 API 路由

**Files:**
- Create: `src/api/routes/pricing.py`
- Modify: `src/app.py` (注册路由)

**Step 1: 创建路由**

`src/api/routes/pricing.py`:

实现设计文档中定义的所有 API 端点:
- `GET /api/pricing/market-prices`
- `POST /api/pricing/market-prices`
- `PUT /api/pricing/market-prices/{id}`
- `DELETE /api/pricing/market-prices/{id}`
- `GET /api/pricing/analysis`
- `GET /api/pricing/batch-stats`
- `GET /api/pricing/thresholds`
- `PUT /api/pricing/thresholds`

**Step 2: 注册路由到 app.py**

在 `src/app.py` 中添加:

```python
from src.api.routes import pricing
app.include_router(pricing.router)
```

**Step 3: 测试 API**

```bash
curl http://localhost:8000/api/pricing/market-prices?task_id=1
```

**Step 4: Commit**

```bash
git commit -m "feat: add pricing API routes (market prices CRUD, analysis, thresholds)"
```

---

### Task 11: 前端 — 溢价分析组件

**Files:**
- Create: `web-ui-react/src/components/pricing/MarketPrice/MarketPriceConfig.tsx`
- Create: `web-ui-react/src/components/pricing/MarketPrice/MarketPriceInput.tsx`
- Create: `web-ui-react/src/components/pricing/PriceAnalysis/PriceTag.tsx`
- Create: `web-ui-react/src/components/pricing/PriceAnalysis/PriceCompareBar.tsx`
- Create: `web-ui-react/src/components/pricing/PriceAnalysis/PriceStats.tsx`
- Create: `web-ui-react/src/components/pricing/PremiumAlert/PremiumAlertBanner.tsx`
- Create: `web-ui-react/src/components/results/ResultsFilter/ResultsFilterPremium.tsx`
- Modify: `web-ui-react/src/components/results/ResultCard/ResultCardPrice.tsx`

**Step 1: 创建 PriceTag 组件**

```tsx
// web-ui-react/src/components/pricing/PriceAnalysis/PriceTag.tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const LEVEL_CONFIG = {
  low_price: { label: '低价捡漏', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  fair: { label: '价格合理', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  slight_premium: { label: '轻微溢价', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  high_premium: { label: '高溢价', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  unknown: { label: '未分析', className: 'bg-muted text-muted-foreground' },
}

interface PriceTagProps {
  level: keyof typeof LEVEL_CONFIG
  premiumRate?: number | null
}

export function PriceTag({ level, premiumRate }: PriceTagProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.unknown
  return (
    <Badge variant="outline" className={cn('text-xs', config.className)}>
      {config.label}
      {premiumRate != null && ` ${premiumRate > 0 ? '+' : ''}${premiumRate}%`}
    </Badge>
  )
}
```

**Step 2: 创建市场基准价配置面板**

**Step 3: 集成到 ResultCard 中**

在商品卡片价格区域添加 PriceTag 和溢价率显示。

**Step 4: 创建溢价筛选器**

**Step 5: 验证溢价分析功能**

**Step 6: Commit**

```bash
git commit -m "feat: add pricing UI components (PriceTag, MarketPriceConfig, PriceStats, filters)"
```

---

## Phase 3: 数据仪表盘 + 智能提醒 + 历史追踪

### Task 12: 后端 — SQLite 存储层

**Files:**
- Create: `src/infrastructure/persistence/sqlite_manager.py`
- Create: `src/infrastructure/persistence/migrations/001_init.sql`

实现 aiosqlite 连接管理器，创建历史数据表:
- `price_history` — 商品价格快照
- `alert_rules` — 提醒规则
- `favorites` — 收藏

---

### Task 13: 后端 — 历史价格追踪服务

**Files:**
- Create: `src/services/history_service.py`
- Create: `src/api/routes/history.py`

实现:
- 每次爬取后按商品 ID 去重存储价格快照
- 检测降价 = 本次价格 < 上次记录
- API: `GET /api/history/{item_id}` — 获取商品价格历史

---

### Task 14: 后端 — 智能提醒规则引擎

**Files:**
- Create: `src/domain/models/alert_rule.py`
- Create: `src/services/alert_service.py`
- Create: `src/api/routes/alerts.py`

实现:
- 规则模型: 条件 + 阈值 + 通知渠道
- 支持: "价格 < X"、"溢价率 < Y%"、"AI评分 > Z"
- 在爬虫管道中，分析完成后执行规则匹配
- API: CRUD for alert rules

---

### Task 15: 前端 — 数据仪表盘页面

**Files:**
- Create: `web-ui-react/src/pages/DashboardPage.tsx`
- Create: `web-ui-react/src/components/dashboard/PriceTrendChart.tsx`
- Create: `web-ui-react/src/components/dashboard/ItemCountChart.tsx`
- Create: `web-ui-react/src/components/dashboard/PremiumDistribution.tsx`
- Create: `web-ui-react/src/components/dashboard/TopKeywords.tsx`
- Create: `web-ui-react/src/components/dashboard/StatsCards.tsx`
- Create: `web-ui-react/src/hooks/dashboard/useDashboard.ts`

使用 Recharts 构建:
- 价格趋势折线图 (LineChart)
- 商品数量柱状图 (BarChart)
- 溢价率分布饼图 (PieChart)
- 热门关键词统计
- 概览统计卡片 (总监控数、低价商品数、高溢价警告数等)

---

### Task 16: 前端 — 智能提醒管理页面

**Files:**
- Create: `web-ui-react/src/components/alerts/AlertRuleForm.tsx`
- Create: `web-ui-react/src/components/alerts/AlertRuleList.tsx`
- Create: `web-ui-react/src/components/alerts/AlertConditionBuilder.tsx`

集成到 Settings 页面或独立页面。

---

### Task 17: 前端 — 历史价格追踪组件

**Files:**
- Create: `web-ui-react/src/components/results/ResultCard/ResultCardHistory.tsx`
- Create: `web-ui-react/src/components/history/PriceHistoryChart.tsx`

在商品卡片中添加"历史价格"展开面板，展示 Recharts 折线图。

---

## Phase 4: 收藏对比

### Task 18: 后端 — 收藏与对比服务

**Files:**
- Create: `src/domain/models/favorite.py`
- Create: `src/services/favorite_service.py`
- Create: `src/api/routes/favorites.py`

实现:
- 收藏: 存储商品快照到 SQLite
- 对比: 根据收藏 ID 列表返回结构化对比数据
- API: `POST/DELETE /api/favorites`, `GET /api/favorites`, `POST /api/favorites/compare`

---

### Task 19: 前端 — 收藏夹与对比页面

**Files:**
- Create: `web-ui-react/src/pages/FavoritesPage.tsx`
- Create: `web-ui-react/src/components/favorites/FavoriteGrid.tsx`
- Create: `web-ui-react/src/components/favorites/FavoriteCard.tsx`
- Create: `web-ui-react/src/components/favorites/CompareTable.tsx`
- Create: `web-ui-react/src/components/favorites/CompareDialog.tsx`
- Create: `web-ui-react/src/hooks/favorites/useFavorites.ts`

收藏功能:
- 在 ResultCard 上添加收藏按钮（心形图标）
- 收藏夹页面展示所有收藏商品

对比功能:
- 勾选 2~4 个商品，点击"对比"
- 弹出对比表格：横向对比价格、成色、卖家信誉、AI评分、溢价率

---

## Phase 5: 清理与交付

### Task 20: 整合测试与清理

**Step 1: 确保所有后端测试通过**

```bash
pytest --cov=src -v
```

**Step 2: 确保前端构建成功**

```bash
cd web-ui-react && npm run build
```

**Step 3: 更新 Dockerfile**

将 `web-ui` 改为 `web-ui-react` 在 Dockerfile 的前端构建阶段。

**Step 4: 更新 start.sh**

```bash
# 将 cd web-ui && npm run build 改为
cd web-ui-react && npm install && npm run build
```

**Step 5: 更新 README.md**

添加新功能说明、更新截图、更新技术栈列表。

**Step 6: 最终验证**

```bash
bash start.sh
# 验证：登录页 Three.js、任务管理、溢价分析、仪表盘、提醒、历史、收藏对比
```

**Step 7: Commit**

```bash
git commit -m "chore: update build configs, dockerfile, readme for React migration"
```

---

## 附录：关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 前端框架 | React 18 | 生态更丰富，用户更熟悉 |
| 3D 库 | @react-three/fiber | React 声明式 Three.js，开发体验好 |
| 图表 | Recharts | React 原生，API 简洁，文档好 |
| 状态管理 | Hooks + Zustand | 轻量，按需引入 |
| 后端存储升级 | SQLite (aiosqlite) | 历史数据需要查询，文件存储不够用 |
| CSS | Tailwind + shadcn/ui | 与现有一致，迁移成本最低 |
