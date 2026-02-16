/** 平台 ID 枚举 */
export type PlatformId = 'xianyu' | 'zhuanzhuan' | 'jd_used' | 'pdd_used' | 'taobao_used' | 'mercari'

/** 平台信息 */
export interface PlatformInfo {
  id: PlatformId
  name: string
  icon: string
  color: string
  enabled: boolean
  description: string
  /** 平台默认货币代码, e.g. 'CNY', 'JPY' */
  currency: string
  /** 平台所在国家/地区代码, e.g. 'CN', 'JP' */
  country: string
}
