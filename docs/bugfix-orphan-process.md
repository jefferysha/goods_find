# Bug 修复：孤儿进程无法停止

## 问题描述

当用户在 Web UI 点击"停止任务"后，如果后端服务曾经重启过，爬虫子进程无法被正确终止，导致任务继续运行。

## 根本原因

`ProcessService` 使用内存字典 `self.processes` 来跟踪子进程对象。当后端重启后：

1. 内存字典被清空
2. 之前启动的子进程成为"孤儿进程"
3. `stop_task()` 方法找不到进程对象，无法发送终止信号
4. 子进程继续运行，但 UI 显示"已停止"

## 解决方案

### 1. 添加孤儿进程查找机制

在 `ProcessService` 中添加 `_find_task_process_by_name()` 方法，通过 `psutil` 库扫描系统进程：

```python
def _find_task_process_by_name(self, task_name: str) -> Optional[int]:
    """通过任务名查找正在运行的进程PID"""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline') or []
                # 查找 spider_v2.py --task-name <task_name> 进程
                if ('spider_v2.py' in ' '.join(cmdline) and 
                    '--task-name' in cmdline and 
                    task_name in cmdline):
                    return proc.info['pid']
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        print(f"查找任务进程失败: {e}")
    return None
```

### 2. 增强 stop_task() 方法

修改 `stop_task()` 方法，当内存中没有进程对象时，尝试查找并终止孤儿进程：

```python
async def stop_task(self, task_id: int, task_name: Optional[str] = None) -> bool:
    process = self.processes.pop(task_id, None)
    
    # 如果内存中没有进程对象，尝试通过任务名查找孤儿进程
    if not process and task_name:
        pid = self._find_task_process_by_name(task_name)
        if pid:
            print(f"发现孤儿进程 (任务: {task_name}, PID: {pid})，尝试终止...")
            # 终止进程组
            os.killpg(os.getpgid(pid), signal.SIGTERM)
            # ... 等待和强制终止逻辑
            return True
    
    # 原有逻辑...
```

### 3. 更新 API 路由

在停止任务的 API 中传递任务名称：

```python
@router.post("/stop/{task_id}")
async def stop_task(...):
    task = await task_service.get_task(task_id)
    task_name = task.task_name if hasattr(task, 'task_name') else task.name
    await process_service.stop_task(task_id, task_name)  # 传递任务名
```

### 4. 添加依赖

在 `pyproject.toml` 中添加 `psutil` 依赖：

```toml
dependencies = [
    # ... 其他依赖
    "psutil>=6.1.1",
]
```

## 测试验证

### 场景 1：正常停止
1. 启动任务
2. 点击停止
3. 验证：进程立即终止

### 场景 2：孤儿进程停止
1. 启动任务
2. 重启后端服务
3. 点击停止
4. 验证：系统找到孤儿进程并成功终止

### 验证命令

```bash
# 查看任务进程
ps aux | grep "spider_v2.*科比手办"

# 查看进程详情
ps -p <PID> -o pid,ppid,pgid,command

# 测试停止功能
curl -X POST http://localhost:8000/api/tasks/stop/0
```

## 影响范围

- ✅ 修复了孤儿进程无法停止的问题
- ✅ 向后兼容，不影响正常流程
- ✅ 添加了详细的日志输出
- ⚠️ 需要重启后端服务生效

## 部署步骤

```bash
# 1. 更新依赖
uv sync

# 2. 重启后端服务
# Docker 部署
docker compose restart app

# 本地开发
# 停止当前服务，重新运行
uv run python -m src.app
```

## 相关文件

- `src/services/process_service.py` - 进程管理服务
- `src/api/routes/tasks.py` - 任务 API 路由
- `pyproject.toml` - 项目依赖配置
