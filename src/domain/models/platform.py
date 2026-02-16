"""平台注册表模型"""
from pydantic import BaseModel
from typing import Dict


class PlatformInfo(BaseModel):
    """平台信息"""
    id: str
    name: str
    icon: str
    color: str
    enabled: bool = False
    description: str = ""
    currency: str = "CNY"
    country: str = ""


# 平台注册表
PLATFORMS: Dict[str, PlatformInfo] = {
    "xianyu": PlatformInfo(
        id="xianyu",
        name="闲鱼",
        icon="xianyu",
        color="#FF6600",
        enabled=True,
        description="阿里巴巴旗下二手交易平台",
    ),
    "zhuanzhuan": PlatformInfo(
        id="zhuanzhuan",
        name="转转",
        icon="zhuanzhuan",
        color="#5AC8FA",
        enabled=False,
        description="58同城旗下二手交易平台",
    ),
    "jd_used": PlatformInfo(
        id="jd_used",
        name="京东二手",
        icon="jd",
        color="#E4393C",
        enabled=False,
        description="京东旗下二手优品",
    ),
    "pdd_used": PlatformInfo(
        id="pdd_used",
        name="拼多多二手",
        icon="pdd",
        color="#E02E24",
        enabled=False,
        description="拼多多二手频道",
    ),
    "taobao_used": PlatformInfo(
        id="taobao_used",
        name="淘宝二手",
        icon="taobao",
        color="#FF5000",
        enabled=False,
        description="淘宝二手市场",
    ),
    "mercari": PlatformInfo(
        id="mercari",
        name="Mercari(煤炉)",
        icon="mercari",
        color="#FF0211",
        enabled=True,
        description="日本最大的二手交易平台",
        currency="JPY",
        country="JP",
    ),
}


def get_platform(platform_id: str) -> PlatformInfo | None:
    """获取平台信息"""
    return PLATFORMS.get(platform_id)


def get_all_platforms() -> list[PlatformInfo]:
    """获取所有平台信息"""
    return list(PLATFORMS.values())


def get_enabled_platforms() -> list[PlatformInfo]:
    """获取所有已启用平台"""
    return [p for p in PLATFORMS.values() if p.enabled]
