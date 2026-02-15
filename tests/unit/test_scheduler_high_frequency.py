"""
测试调度服务的高频轮询模式
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.domain.models.task import Task
from src.services.scheduler_service import SchedulerService, MIN_HIGH_FREQUENCY_INTERVAL


class FakeProcessService:
    def __init__(self):
        self.started = []
        self._running = {}

    async def start_task(self, task_id: int, task_name: str) -> bool:
        self.started.append((task_id, task_name))
        return True

    def is_running(self, task_id: int) -> bool:
        return self._running.get(task_id, False)


def _make_task(**overrides):
    defaults = dict(
        id=1,
        task_name="MacBook",
        enabled=True,
        keyword="macbook",
        description="",
        max_pages=2,
        personal_only=True,
        ai_prompt_base_file="prompts/base_prompt.txt",
        ai_prompt_criteria_file="prompts/macbook_criteria.txt",
        is_running=False,
    )
    defaults.update(overrides)
    return Task(**defaults)


class TestSchedulerHighFrequency:
    """调度服务高频轮询模式测试"""

    def setup_method(self):
        self.process_service = FakeProcessService()
        self.scheduler_service = SchedulerService(self.process_service)

    @pytest.mark.anyio
    async def test_high_frequency_task_adds_interval_job(self):
        """高频任务应添加 IntervalTrigger 类型的任务"""
        task = _make_task(monitor_mode="high_frequency", monitor_interval=60)
        await self.scheduler_service.reload_jobs([task])

        jobs = self.scheduler_service.scheduler.get_jobs()
        assert len(jobs) == 1
        assert "HighFreq" in jobs[0].name
        # IntervalTrigger 的 interval 属性
        from apscheduler.triggers.interval import IntervalTrigger
        assert isinstance(jobs[0].trigger, IntervalTrigger)

    @pytest.mark.anyio
    async def test_high_frequency_enforces_min_interval(self):
        """高频间隔不能低于 MIN_HIGH_FREQUENCY_INTERVAL"""
        task = _make_task(monitor_mode="high_frequency", monitor_interval=5)
        await self.scheduler_service.reload_jobs([task])

        jobs = self.scheduler_service.scheduler.get_jobs()
        assert len(jobs) == 1
        # 验证实际间隔至少为 MIN_HIGH_FREQUENCY_INTERVAL
        trigger = jobs[0].trigger
        assert trigger.interval.total_seconds() >= MIN_HIGH_FREQUENCY_INTERVAL

    @pytest.mark.anyio
    async def test_cron_task_adds_cron_job(self):
        """Cron 模式任务应添加 CronTrigger 类型的任务"""
        task = _make_task(monitor_mode="cron", cron="*/15 * * * *")
        await self.scheduler_service.reload_jobs([task])

        jobs = self.scheduler_service.scheduler.get_jobs()
        assert len(jobs) == 1
        assert "Scheduled" in jobs[0].name
        from apscheduler.triggers.cron import CronTrigger
        assert isinstance(jobs[0].trigger, CronTrigger)

    @pytest.mark.anyio
    async def test_disabled_task_not_scheduled(self):
        """禁用的任务不应被调度"""
        task = _make_task(enabled=False, monitor_mode="high_frequency", monitor_interval=30)
        await self.scheduler_service.reload_jobs([task])

        jobs = self.scheduler_service.scheduler.get_jobs()
        assert len(jobs) == 0

    @pytest.mark.anyio
    async def test_cron_without_expression_not_scheduled(self):
        """Cron 模式但没有 cron 表达式时不应被调度"""
        task = _make_task(monitor_mode="cron", cron=None)
        await self.scheduler_service.reload_jobs([task])

        jobs = self.scheduler_service.scheduler.get_jobs()
        assert len(jobs) == 0

    @pytest.mark.anyio
    async def test_run_task_skips_when_running(self):
        """高频模式下，任务正在运行时应跳过"""
        self.process_service._running[1] = True
        await self.scheduler_service._run_task(1, "MacBook")
        assert len(self.process_service.started) == 0

    @pytest.mark.anyio
    async def test_run_task_starts_when_not_running(self):
        """任务未运行时应正常启动"""
        self.process_service._running[1] = False
        await self.scheduler_service._run_task(1, "MacBook")
        assert len(self.process_service.started) == 1
        assert self.process_service.started[0] == (1, "MacBook")

    @pytest.mark.anyio
    async def test_mixed_tasks_scheduling(self):
        """混合任务（Cron + 高频）应各自正确调度"""
        tasks = [
            _make_task(id=1, task_name="Task1", monitor_mode="cron", cron="0 8 * * *"),
            _make_task(id=2, task_name="Task2", monitor_mode="high_frequency", monitor_interval=45),
        ]
        await self.scheduler_service.reload_jobs(tasks)

        jobs = self.scheduler_service.scheduler.get_jobs()
        assert len(jobs) == 2

        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger
        trigger_types = {type(j.trigger) for j in jobs}
        assert CronTrigger in trigger_types
        assert IntervalTrigger in trigger_types
