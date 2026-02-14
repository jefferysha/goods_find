import type { PlatformId, PlatformInfo } from '@/types/platform'

/**
 * 平台注册表 - 前端本地配置
 * 与后端 src/domain/models/platform.py 保持同步
 */
export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  xianyu: {
    id: 'xianyu',
    name: '闲鱼',
    icon: 'xianyu',
    color: '#FF6600',
    enabled: true,
    description: '阿里巴巴旗下二手交易平台',
  },
  zhuanzhuan: {
    id: 'zhuanzhuan',
    name: '转转',
    icon: 'zhuanzhuan',
    color: '#5AC8FA',
    enabled: false,
    description: '58同城旗下二手交易平台',
  },
  jd_used: {
    id: 'jd_used',
    name: '京东二手',
    icon: 'jd',
    color: '#E4393C',
    enabled: false,
    description: '京东旗下二手优品',
  },
  pdd_used: {
    id: 'pdd_used',
    name: '拼多多二手',
    icon: 'pdd',
    color: '#E02E24',
    enabled: false,
    description: '拼多多二手频道',
  },
  taobao_used: {
    id: 'taobao_used',
    name: '淘宝二手',
    icon: 'taobao',
    color: '#FF5000',
    enabled: false,
    description: '淘宝二手市场',
  },
  mercari: {
    id: 'mercari',
    name: 'Mercari(煤炉)',
    icon: 'mercari',
    color: '#FF0211',
    enabled: true,
    description: '日本最大的二手交易平台',
  },
}

/** 获取所有平台列表 */
export function getAllPlatforms(): PlatformInfo[] {
  return Object.values(PLATFORMS)
}

/** 获取已启用平台列表 */
export function getEnabledPlatforms(): PlatformInfo[] {
  return Object.values(PLATFORMS).filter((p) => p.enabled)
}

/** 根据 ID 获取平台信息 */
export function getPlatform(id: string): PlatformInfo | undefined {
  return PLATFORMS[id as PlatformId]
}

/** 获取平台显示名称 */
export function getPlatformName(id: string): string {
  return PLATFORMS[id as PlatformId]?.name ?? id
}

/** 获取平台主题色 */
export function getPlatformColor(id: string): string {
  return PLATFORMS[id as PlatformId]?.color ?? '#888888'
}

/** 平台是否已启用 */
export function isPlatformEnabled(id: string): boolean {
  return PLATFORMS[id as PlatformId]?.enabled ?? false
}
