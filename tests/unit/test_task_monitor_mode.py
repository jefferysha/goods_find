"""
测试 Task 模型的高频监控和秒推新字段
"""
from src.domain.models.task import Task, TaskCreate, TaskUpdate, MonitorMode


class TestTaskMonitorMode:
    """Task 模型新增的监控模式字段测试"""

    def _make_task(self, **overrides):
        defaults = dict(
            id=1,
            task_name="MacBook Air M1",
            enabled=True,
            keyword="macbook air m1",
            description="test",
            max_pages=2,
            personal_only=True,
            ai_prompt_base_file="prompts/base_prompt.txt",
            ai_prompt_criteria_file="prompts/macbook_criteria.txt",
            is_running=False,
        )
        defaults.update(overrides)
        return Task(**defaults)

    def test_default_monitor_mode_is_cron(self):
        task = self._make_task()
        assert task.monitor_mode == "cron"

    def test_default_monitor_interval_is_60(self):
        task = self._make_task()
        assert task.monitor_interval == 60

    def test_default_instant_notify_is_false(self):
        task = self._make_task()
        assert task.instant_notify is False

    def test_high_frequency_mode(self):
        task = self._make_task(monitor_mode="high_frequency", monitor_interval=30)
        assert task.monitor_mode == "high_frequency"
        assert task.monitor_interval == 30

    def test_instant_notify_enabled(self):
        task = self._make_task(instant_notify=True)
        assert task.instant_notify is True

    def test_apply_update_monitor_fields(self):
        task = self._make_task()
        update = TaskUpdate(
            monitor_mode="high_frequency",
            monitor_interval=45,
            instant_notify=True,
        )
        updated = task.apply_update(update)
        assert updated.monitor_mode == "high_frequency"
        assert updated.monitor_interval == 45
        assert updated.instant_notify is True

    def test_apply_update_partial_monitor_fields(self):
        """只更新部分字段时，其他字段保持原值"""
        task = self._make_task(monitor_mode="high_frequency", monitor_interval=30)
        update = TaskUpdate(instant_notify=True)
        updated = task.apply_update(update)
        assert updated.monitor_mode == "high_frequency"
        assert updated.monitor_interval == 30
        assert updated.instant_notify is True


class TestTaskCreateMonitorMode:
    """TaskCreate DTO 新增的监控模式字段测试"""

    def test_default_values(self):
        tc = TaskCreate(
            task_name="Test",
            keyword="test",
            ai_prompt_criteria_file="prompts/test.txt",
        )
        assert tc.monitor_mode == "cron"
        assert tc.monitor_interval == 60
        assert tc.instant_notify is False

    def test_custom_values(self):
        tc = TaskCreate(
            task_name="Test",
            keyword="test",
            ai_prompt_criteria_file="prompts/test.txt",
            monitor_mode="high_frequency",
            monitor_interval=30,
            instant_notify=True,
        )
        assert tc.monitor_mode == "high_frequency"
        assert tc.monitor_interval == 30
        assert tc.instant_notify is True


class TestMonitorModeEnum:
    """MonitorMode 枚举测试"""

    def test_cron_value(self):
        assert MonitorMode.CRON == "cron"

    def test_high_frequency_value(self):
        assert MonitorMode.HIGH_FREQUENCY == "high_frequency"
