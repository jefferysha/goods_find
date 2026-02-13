import asyncio
import json
import os
from unittest.mock import AsyncMock, patch

from src.utils import (
    format_registration_days,
    get_link_unique_key,
    safe_get,
    save_to_jsonl,
)


def test_safe_get_nested_and_default():
    data = {"a": {"b": [{"c": "value"}]}}
    assert asyncio.run(safe_get(data, "a", "b", 0, "c")) == "value"
    assert asyncio.run(safe_get(data, "a", "b", 1, "c", default="missing")) == "missing"


def test_format_registration_days():
    assert format_registration_days(400).startswith("\u6765\u95f2\u9c7c")
    assert format_registration_days(-1) == "\u672a\u77e5"


def test_get_link_unique_key():
    link = "https://www.goofish.com/item?id=123&foo=bar"
    assert get_link_unique_key(link) == "https://www.goofish.com/item?id=123"


def test_save_to_jsonl():
    record = {"id": 1, "title": "Sony A7M4"}
    mock_repo = AsyncMock()
    mock_repo.insert.return_value = True

    with patch(
        "src.infrastructure.persistence.item_repository.ItemRepository",
        return_value=mock_repo,
    ) as MockRepoClass:
        ok = asyncio.run(save_to_jsonl(record, keyword="sony a7m4"))

    assert ok is True
    MockRepoClass.assert_called_once()
    mock_repo.insert.assert_called_once_with(record)


def test_sanitize_filename():
    from src.utils import sanitize_filename
    assert sanitize_filename("hello world!") == "hello_world"
    assert sanitize_filename("Sony A7M4") == "Sony_A7M4"
    assert sanitize_filename("") == "task"
    assert sanitize_filename("a--b__c") == "a--b_c"


def test_build_task_log_path():
    from src.utils import build_task_log_path
    result = build_task_log_path(0, "Sony A7M4")
    assert result == os.path.join("logs", "Sony_A7M4_0.log")


def test_resolve_task_log_path_primary_exists(tmp_path, monkeypatch):
    from src.utils import resolve_task_log_path
    monkeypatch.chdir(tmp_path)
    os.makedirs("logs", exist_ok=True)
    (tmp_path / "logs" / "Sony_A7M4_1.log").write_text("log", encoding="utf-8")
    result = resolve_task_log_path(1, "Sony A7M4")
    assert result == os.path.join("logs", "Sony_A7M4_1.log")


def test_resolve_task_log_path_fallback(tmp_path, monkeypatch):
    from src.utils import resolve_task_log_path
    monkeypatch.chdir(tmp_path)
    os.makedirs("logs", exist_ok=True)
    (tmp_path / "logs" / "old_name_2.log").write_text("log", encoding="utf-8")
    result = resolve_task_log_path(2, "new name")
    # fallback to glob match
    assert result.endswith("_2.log")


def test_convert_goofish_link():
    from src.utils import convert_goofish_link
    url = "https://www.goofish.com/item?id=123&foo=bar"
    converted = convert_goofish_link(url)
    assert "pages.goofish.com" in converted
    assert "123" in converted
    # non-matching url returns as-is
    assert convert_goofish_link("https://example.com") == "https://example.com"


def test_log_time(capsys):
    from src.utils import log_time
    log_time("test message", prefix="[prefix]")
    captured = capsys.readouterr()
    assert "[prefix]test message" in captured.out
