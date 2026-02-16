"""测试平台模型的 currency 字段"""
from src.domain.models.platform import (
    PlatformInfo,
    PLATFORMS,
    get_platform,
    get_all_platforms,
    get_enabled_platforms,
)


def test_platform_info_has_currency_field():
    """PlatformInfo 模型应包含 currency 字段"""
    p = PlatformInfo(
        id="test", name="Test", icon="test", color="#000",
        currency="USD",
    )
    assert p.currency == "USD"


def test_platform_info_default_currency_is_cny():
    """PlatformInfo 的 currency 默认值应为 CNY"""
    p = PlatformInfo(id="test", name="Test", icon="test", color="#000")
    assert p.currency == "CNY"


def test_xianyu_platform_currency_is_cny():
    """闲鱼平台的 currency 应为 CNY"""
    xianyu = PLATFORMS["xianyu"]
    assert xianyu.currency == "CNY"


def test_mercari_platform_currency_is_jpy():
    """Mercari 平台的 currency 应为 JPY"""
    mercari = PLATFORMS["mercari"]
    assert mercari.currency == "JPY"


def test_platform_info_has_country_field():
    """PlatformInfo 模型应包含 country 字段"""
    p = PlatformInfo(
        id="test", name="Test", icon="test", color="#000",
        country="US",
    )
    assert p.country == "US"


def test_platform_info_default_country_is_empty():
    """PlatformInfo 的 country 默认值应为空字符串"""
    p = PlatformInfo(id="test", name="Test", icon="test", color="#000")
    assert p.country == ""


def test_get_platform_returns_currency():
    """get_platform 返回的平台信息应包含 currency"""
    p = get_platform("mercari")
    assert p is not None
    assert p.currency == "JPY"


def test_all_platforms_have_currency():
    """所有平台都应有 currency 字段"""
    for p in get_all_platforms():
        assert hasattr(p, "currency")
        assert isinstance(p.currency, str)
        assert len(p.currency) == 3  # ISO 4217 货币代码长度为 3
