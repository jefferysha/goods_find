"""
进程管理服务
负责管理爬虫进程的启动和停止
"""
import asyncio
import sys
import os
import signal
import psutil
from datetime import datetime
from typing import Dict, Optional
from src.utils import build_task_log_path


class ProcessService:
    """进程管理服务"""

    def __init__(self):
        self.processes: Dict[int, asyncio.subprocess.Process] = {}
        self.log_paths: Dict[int, str] = {}

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

    def is_running(self, task_id: int) -> bool:
        """检查任务是否正在运行"""
        process = self.processes.get(task_id)
        return process is not None and process.returncode is None

    async def start_task(self, task_id: int, task_name: str) -> bool:
        """启动任务进程"""
        if self.is_running(task_id):
            print(f"任务 '{task_name}' (ID: {task_id}) 已在运行中")
            return False

        try:
            os.makedirs("logs", exist_ok=True)
            log_file_path = build_task_log_path(task_id, task_name)
            log_file_handle = open(log_file_path, 'a', encoding='utf-8')

            preexec_fn = os.setsid if sys.platform != "win32" else None
            child_env = os.environ.copy()
            child_env["PYTHONIOENCODING"] = "utf-8"
            child_env["PYTHONUTF8"] = "1"

            process = await asyncio.create_subprocess_exec(
                sys.executable, "-u", "spider_v2.py", "--task-name", task_name,
                stdout=log_file_handle,
                stderr=log_file_handle,
                preexec_fn=preexec_fn,
                env=child_env
            )

            self.processes[task_id] = process
            self.log_paths[task_id] = log_file_path
            print(f"启动任务 '{task_name}' (PID: {process.pid})")
            return True

        except Exception as e:
            if task_id in self.log_paths:
                del self.log_paths[task_id]
            print(f"启动任务 '{task_name}' 失败: {e}")
            return False

    def _append_stop_marker(self, log_path: str | None) -> None:
        if not log_path:
            return
        try:
            ts = datetime.now().strftime(' %Y-%m-%d %H:%M:%S')
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(f"[{ts}] !!! 任务已被终止 !!!\n")
        except Exception as e:
            print(f"写入任务终止标记失败: {e}")

    async def stop_task(self, task_id: int, task_name: Optional[str] = None) -> bool:
        """停止任务进程"""
        process = self.processes.pop(task_id, None)
        log_path = self.log_paths.pop(task_id, None)
        
        # 如果内存中没有进程对象，尝试通过任务名查找孤儿进程
        if not process and task_name:
            pid = self._find_task_process_by_name(task_name)
            if pid:
                print(f"发现孤儿进程 (任务: {task_name}, PID: {pid})，尝试终止...")
                try:
                    if sys.platform != "win32":
                        os.killpg(os.getpgid(pid), signal.SIGTERM)
                    else:
                        os.kill(pid, signal.SIGTERM)
                    
                    # 等待进程结束
                    await asyncio.sleep(2)
                    
                    # 检查进程是否还存在
                    try:
                        if sys.platform != "win32":
                            os.killpg(os.getpgid(pid), 0)  # 检查进程组是否存在
                            # 如果还存在，强制终止
                            print(f"进程 {pid} 未响应 SIGTERM，使用 SIGKILL 强制终止...")
                            os.killpg(os.getpgid(pid), signal.SIGKILL)
                        else:
                            os.kill(pid, 0)
                            os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass  # 进程已结束
                    
                    self._append_stop_marker(log_path)
                    print(f"孤儿进程 {pid} (任务: {task_name}) 已终止")
                    return True
                except ProcessLookupError:
                    print(f"进程 {pid} 已不存在")
                    return True
                except Exception as e:
                    print(f"终止孤儿进程 {pid} 失败: {e}")
                    return False
        
        if not process:
            print(f"任务 ID {task_id} 没有正在运行的进程")
            return False
            
        if process.returncode is not None:
            print(f"任务进程 {process.pid} (ID: {task_id}) 已退出，略过停止")
            return False

        try:
            if sys.platform != "win32":
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            else:
                process.terminate()

            try:
                await asyncio.wait_for(process.wait(), timeout=20)
            except asyncio.TimeoutError:
                print(f"任务进程 {process.pid} (ID: {task_id}) 未在 20 秒内退出，准备强制终止...")
                if sys.platform != "win32":
                    try:
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                else:
                    process.kill()
                await process.wait()

            self._append_stop_marker(log_path)
            print(f"任务进程 {process.pid} (ID: {task_id}) 已终止")
            return True

        except ProcessLookupError:
            print(f"进程 (ID: {task_id}) 已不存在")
            return False
        except Exception as e:
            print(f"停止任务进程 (ID: {task_id}) 时出错: {e}")
            return False

    async def stop_all(self):
        """停止所有任务进程"""
        task_ids = list(self.processes.keys())
        for task_id in task_ids:
            await self.stop_task(task_id)
