"""platform 模型纯函数单元测试"""
from src.domain.models.platform import (
    get_platform,
    get_all_platforms,
    get_enabled_platforms,
    PLATFORMS,
    PlatformInfo,
)


def test_get_platform_existing():
    p = get_platform("xianyu")
    assert p is not None
    assert p.name == "闲鱼"
    assert p.enabled is True


def test_get_platform_nonexisting():
    assert get_platform("nonexistent") is None


def test_get_platform_zhuanzhuan():
    p = get_platform("zhuanzhuan")
    assert p is not None
    assert p.name == "转转"
    assert p.enabled is False


def test_get_all_platforms():
    platforms = get_all_platforms()
    assert len(platforms) == len(PLATFORMS)
    ids = {p.id for p in platforms}
    assert "xianyu" in ids
    assert "zhuanzhuan" in ids
    assert "jd_used" in ids


def test_get_all_platforms_returns_platform_info():
    platforms = get_all_platforms()
    for p in platforms:
        assert isinstance(p, PlatformInfo)


def test_get_enabled_platforms():
    enabled = get_enabled_platforms()
    for p in enabled:
        assert p.enabled is True
    # At least xianyu should be enabled
    assert any(p.id == "xianyu" for p in enabled)


def test_get_enabled_platforms_excludes_disabled():
    enabled = get_enabled_platforms()
    enabled_ids = {p.id for p in enabled}
    # zhuanzhuan is disabled by default
    assert "zhuanzhuan" not in enabled_ids


def test_platform_info_fields():
    p = get_platform("xianyu")
    assert p.icon == "xianyu"
    assert p.color == "#FF6600"
    assert p.description != ""
    assert p.description == "阿里巴巴旗下二手交易平台"


def test_platform_info_fields_jd():
    p = get_platform("jd_used")
    assert p is not None
    assert p.name == "京东二手"
    assert p.icon == "jd"
    assert p.color == "#E4393C"
    assert p.enabled is False


def test_platform_info_fields_pdd():
    p = get_platform("pdd_used")
    assert p is not None
    assert p.name == "拼多多二手"
    assert p.icon == "pdd"


def test_platforms_dict_keys():
    expected_ids = {"xianyu", "zhuanzhuan", "jd_used", "pdd_used", "taobao_used"}
    assert set(PLATFORMS.keys()) == expected_ids
