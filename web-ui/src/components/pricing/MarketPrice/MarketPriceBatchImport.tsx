import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createMarketPrice } from '@/api/pricing'

interface ParsedRow {
  keyword: string
  reference_price: number
  fair_used_price?: number
  category?: string
  condition?: string
  source?: string
  note?: string
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return [] // Need header + at least one data row

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    if (values.length < 2) continue

    const getCol = (names: string[]) => {
      for (const name of names) {
        const idx = header.indexOf(name)
        if (idx >= 0 && values[idx]) return values[idx]
      }
      return ''
    }

    const keyword = getCol(['关键词', 'keyword', '商品名', '名称', 'name'])
    const refPriceStr = getCol(['新品参考价', 'reference_price', '参考价', 'price', '价格'])
    const refPrice = parseFloat(refPriceStr)

    if (!keyword || isNaN(refPrice) || refPrice <= 0) continue

    const fairStr = getCol(['合理二手价', 'fair_used_price', '二手价', 'fair_price'])
    const fairPrice = parseFloat(fairStr)

    rows.push({
      keyword,
      reference_price: refPrice,
      fair_used_price: isNaN(fairPrice) ? undefined : fairPrice,
      category: getCol(['品类', 'category', '分类']) || undefined,
      condition: getCol(['成色', 'condition']) || 'good',
      source: getCol(['来源', 'source', '价格来源']) || undefined,
      note: getCol(['备注', 'note', '说明']) || undefined,
    })
  }

  return rows
}

interface MarketPriceBatchImportProps {
  taskId: number
  keyword?: string
  onImported: () => void
}

export function MarketPriceBatchImport({ taskId, keyword = '', onImported }: MarketPriceBatchImportProps) {
  const [open, setOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      toast({ title: '未解析到有效数据', description: '请检查 CSV 格式', variant: 'destructive' })
      return
    }

    setParsedRows(rows)
  }

  const handleImport = async () => {
    setImporting(true)
    setImportProgress(0)

    let success = 0
    let failed = 0

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i]
      try {
        await createMarketPrice({
          task_id: taskId,
          keyword: row.keyword || keyword,
          reference_price: row.reference_price,
          fair_used_price: row.fair_used_price,
          condition: (row.condition || 'good') as 'new' | 'like_new' | 'good' | 'fair',
          category: row.category || '',
          platform: 'xianyu',
          source: row.source || '',
          note: row.note || '',
        })
        success++
      } catch {
        failed++
      }
      setImportProgress(((i + 1) / parsedRows.length) * 100)
    }

    setImporting(false)
    toast({
      title: `导入完成：${success} 条成功${failed > 0 ? `，${failed} 条失败` : ''}`,
    })
    setParsedRows([])
    setOpen(false)
    onImported()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = (isOpen: boolean) => {
    if (!importing) {
      setOpen(isOpen)
      if (!isOpen) {
        setParsedRows([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          批量导入
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量导入基准价</DialogTitle>
          <DialogDescription>
            上传 CSV 文件批量设置基准价。CSV 需包含列头：关键词, 新品参考价, 合理二手价(可选), 品类(可选), 来源(可选)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File upload */}
          <div className="space-y-2">
            <Label>选择 CSV 文件</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
            />
          </div>

          {/* CSV template hint */}
          <div className="rounded-md border bg-muted/50 p-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">CSV 格式示例：</p>
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
{`关键词,新品参考价,合理二手价,品类,来源,备注
MacBook Air M1,7999,4500,笔记本,京东自营,2024款
iPhone 15,5999,3800,手机,苹果官网,128G版本
PS5 光驱版,3899,2500,游戏主机,京东自营,国行`}
            </pre>
          </div>

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                预览（共 {parsedRows.length} 条）
              </p>
              <div className="max-h-[300px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>关键词</TableHead>
                      <TableHead className="text-right">新品参考价</TableHead>
                      <TableHead className="text-right">合理二手价</TableHead>
                      <TableHead>品类</TableHead>
                      <TableHead>来源</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.keyword}</TableCell>
                        <TableCell className="text-right">¥{row.reference_price.toFixed(0)}</TableCell>
                        <TableCell className="text-right">
                          {row.fair_used_price ? `¥${row.fair_used_price.toFixed(0)}` : '-'}
                        </TableCell>
                        <TableCell>{row.category || '-'}</TableCell>
                        <TableCell>{row.source || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Import progress */}
          {importing && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                导入中... {importProgress.toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || parsedRows.length === 0}
          >
            {importing ? '导入中...' : `确认导入 (${parsedRows.length} 条)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
