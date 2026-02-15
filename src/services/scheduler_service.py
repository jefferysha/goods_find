"""
调度服务
负责管理定时任务的调度，支持传统 Cron 模式和高频轮询模式
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from typing import List
from src.domain.models.task import Task
from src.services.process_service import ProcessService


# 高频模式最小间隔（秒）
MIN_HIGH_FREQUENCY_INTERVAL = 30


class SchedulerService:
    """调度服务"""

    def __init__(self, process_service: ProcessService):
        self.scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")
        self.process_service = process_service

    def start(self):
        """启动调度器"""
        if not self.scheduler.running:
            self.scheduler.start()
            print("调度器已启动")

    def stop(self):
        """停止调度器"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            print("调度器已停止")

    async def reload_jobs(self, tasks: List[Task]):
        """重新加载所有定时任务（支持 Cron 和高频轮询两种模式）"""
        print("正在重新加载定时任务...")
        self.scheduler.remove_all_jobs()

        for task in tasks:
            if not task.enabled:
                continue

            monitor_mode = getattr(task, 'monitor_mode', 'cron') or 'cron'

            if monitor_mode == "high_frequency":
                # 高频轮询模式：使用 IntervalTrigger
                interval = max(
                    MIN_HIGH_FREQUENCY_INTERVAL,
                    getattr(task, 'monitor_interval', 60) or 60
                )
                trigger = IntervalTrigger(seconds=interval)
                self.scheduler.add_job(
                    self._run_task,
                    trigger=trigger,
                    args=[task.id, task.task_name],
                    id=f"task_{task.id}",
                    name=f"HighFreq({interval}s): {task.task_name}",
                    replace_existing=True,
                    max_instances=1,  # 防止上一轮未完成时重复启动
                )
                print(f"  -> 已为任务 '{task.task_name}' 添加高频轮询: 每 {interval} 秒")

            elif task.cron:
                # 传统 Cron 模式
                try:
                    trigger = CronTrigger.from_crontab(task.cron)
                    self.scheduler.add_job(
                        self._run_task,
                        trigger=trigger,
                        args=[task.id, task.task_name],
                        id=f"task_{task.id}",
                        name=f"Scheduled: {task.task_name}",
                        replace_existing=True
                    )
                    print(f"  -> 已为任务 '{task.task_name}' 添加定时规则: '{task.cron}'")
                except ValueError as e:
                    print(f"  -> [警告] 任务 '{task.task_name}' 的 Cron 表达式无效: {e}")

        print("定时任务加载完成")

    async def _run_task(self, task_id: int, task_name: str):
        """执行定时任务"""
        # 如果任务正在运行，高频模式下跳过本轮
        if self.process_service.is_running(task_id):
            print(f"任务 '{task_name}' 仍在运行中，跳过本轮调度。")
            return
        print(f"定时任务触发: 正在为任务 '{task_name}' 启动爬虫...")
        await self.process_service.start_task(task_id, task_name)
