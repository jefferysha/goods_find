import { useEffect, useState, useCallback } from 'react'
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Tag,
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import type { CategoryNode } from '@/api/categories'
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/api/categories'

// ── 树节点组件 ─────────────────────────────────────

function TreeNode({
  node,
  level,
  onAddChild,
  onEdit,
  onDelete,
  onUpdateKeywords,
}: {
  node: CategoryNode
  level: number
  onAddChild: (parentId: string, parentLevel: number) => void
  onEdit: (node: CategoryNode) => void
  onDelete: (node: CategoryNode) => void
  onUpdateKeywords: (node: CategoryNode) => void
}) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* 展开/收起 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        {/* 节点名称 */}
        <FolderTree className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{node.name}</span>

        {/* 关键词 */}
        {node.keywords?.length > 0 && (
          <div className="ml-2 flex flex-wrap gap-1">
            {node.keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-[10px] px-1.5 py-0">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* 层级标签 */}
        <Badge variant="outline" className="ml-auto text-[10px] opacity-60">
          L{node.level}
        </Badge>

        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="添加子分类"
            onClick={() => onAddChild(node.id, node.level)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="管理关键词"
            onClick={() => onUpdateKeywords(node)}
          >
            <Tag className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="编辑名称"
            onClick={() => onEdit(node)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            title="删除分类"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateKeywords={onUpdateKeywords}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 主页面 ──────────────────────────────────────────

export default function CategoryPage() {
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 新建分类
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createParentLevel, setCreateParentLevel] = useState(0)
  const [createName, setCreateName] = useState('')

  // 编辑名称
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editNode, setEditNode] = useState<CategoryNode | null>(null)
  const [editName, setEditName] = useState('')

  // 删除确认
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteNode, setDeleteNode] = useState<CategoryNode | null>(null)

  // 关键词管理
  const [showKeywordDialog, setShowKeywordDialog] = useState(false)
  const [keywordNode, setKeywordNode] = useState<CategoryNode | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywordList, setKeywordList] = useState<string[]>([])

  const fetchTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCategoryTree()
      setTree(data)
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTree()
  }, [fetchTree])

  // ── 新建 ───────────────────────────────
  const handleAddChild = useCallback((parentId: string, parentLevel: number) => {
    setCreateParentId(parentId)
    setCreateParentLevel(parentLevel)
    setCreateName('')
    setShowCreateDialog(true)
  }, [])

  const handleAddRoot = useCallback(() => {
    setCreateParentId(null)
    setCreateParentLevel(0)
    setCreateName('')
    setShowCreateDialog(true)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return
    try {
      await createCategory({
        name: createName.trim(),
        level: createParentLevel + 1,
        parent_id: createParentId,
      })
      setShowCreateDialog(false)
      fetchTree()
    } catch (e: any) {
      setError(e.message || '创建失败')
    }
  }, [createName, createParentId, createParentLevel, fetchTree])

  // ── 编辑名称 ───────────────────────────
  const handleEditStart = useCallback((node: CategoryNode) => {
    setEditNode(node)
    setEditName(node.name)
    setShowEditDialog(true)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editNode || !editName.trim()) return
    try {
      await updateCategory(editNode.id, { name: editName.trim() })
      setShowEditDialog(false)
      fetchTree()
    } catch (e: any) {
      setError(e.message || '更新失败')
    }
  }, [editNode, editName, fetchTree])

  // ── 删除 ───────────────────────────────
  const handleDeleteStart = useCallback((node: CategoryNode) => {
    setDeleteNode(node)
    setShowDeleteDialog(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteNode) return
    try {
      await deleteCategory(deleteNode.id)
      setShowDeleteDialog(false)
      fetchTree()
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
  }, [deleteNode, fetchTree])

  // ── 关键词管理 ─────────────────────────
  const handleKeywordsStart = useCallback((node: CategoryNode) => {
    setKeywordNode(node)
    setKeywordList([...(node.keywords || [])])
    setKeywordInput('')
    setShowKeywordDialog(true)
  }, [])

  const handleAddKeyword = useCallback(() => {
    const kw = keywordInput.trim()
    if (!kw || keywordList.includes(kw)) return
    setKeywordList((prev) => [...prev, kw])
    setKeywordInput('')
  }, [keywordInput, keywordList])

  const handleRemoveKeyword = useCallback((kw: string) => {
    setKeywordList((prev) => prev.filter((k) => k !== kw))
  }, [])

  const handleKeywordsSave = useCallback(async () => {
    if (!keywordNode) return
    try {
      await updateCategory(keywordNode.id, { keywords: keywordList })
      setShowKeywordDialog(false)
      fetchTree()
    } catch (e: any) {
      setError(e.message || '保存失败')
    }
  }, [keywordNode, keywordList, fetchTree])

  // ── 渲染 ──────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderTree className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">品类管理</h1>
            <p className="text-sm text-muted-foreground">管理商品分类树，配置关键词映射</p>
          </div>
        </div>
        <Button onClick={handleAddRoot} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          新建根分类
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2 h-6" onClick={() => setError(null)}>
            关闭
          </Button>
        </div>
      )}

      {/* 分类树 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">分类树</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              加载中...
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">暂无分类</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                点击「新建根分类」创建第一个品类
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  level={0}
                  onAddChild={handleAddChild}
                  onEdit={handleEditStart}
                  onDelete={handleDeleteStart}
                  onUpdateKeywords={handleKeywordsStart}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建分类对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createParentId ? '新建子分类' : '新建根分类'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">分类名称</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="输入分类名称"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑名称对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑分类名称</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">分类名称</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="输入新名称"
                onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditSave} disabled={!editName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              确定要删除分类 <span className="font-medium text-foreground">{deleteNode?.name}</span> 吗？
              {deleteNode?.children && deleteNode.children.length > 0 && (
                <span className="mt-1 block text-destructive">
                  该分类下有 {deleteNode.children.length} 个子分类，将一并删除！
                </span>
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关键词管理对话框 */}
      <Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理关键词 — {keywordNode?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 当前关键词 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">当前关键词</label>
              {keywordList.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无关键词</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {keywordList.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                      {kw}
                      <button
                        onClick={() => handleRemoveKeyword(kw)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 添加关键词 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">添加关键词</label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="输入关键词后回车添加"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
                <Button variant="outline" size="icon" onClick={handleAddKeyword}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeywordDialog(false)}>
              取消
            </Button>
            <Button onClick={handleKeywordsSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
