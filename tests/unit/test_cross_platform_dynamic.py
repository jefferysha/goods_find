"""测试 cross_platform_service 动态读取 currency"""
from src.services.cross_platform_service import CrossPlatformService, get_platform_currency


def test_get_platform_currency_xianyu():
    """闲鱼平台 currency 应为 CNY"""
    assert get_platform_currency("xianyu") == "CNY"


def test_get_platform_currency_mercari():
    """Mercari 平台 currency 应为 JPY"""
    assert get_platform_currency("mercari") == "JPY"


def test_get_platform_currency_unknown_defaults_to_cny():
    """未知平台默认 currency 为 CNY"""
    assert get_platform_currency("unknown_platform") == "CNY"


def test_get_platform_currency_zhuanzhuan():
    """转转平台 currency 应为 CNY"""
    assert get_platform_currency("zhuanzhuan") == "CNY"
