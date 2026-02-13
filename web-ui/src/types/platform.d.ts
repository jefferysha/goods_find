/** 平台 ID 枚举 */
export type PlatformId = 'xianyu' | 'zhuanzhuan' | 'jd_used' | 'pdd_used' | 'taobao_used'

/** 平台信息 */
export interface PlatformInfo {
  id: PlatformId
  name: string
  icon: string
  color: string
  enabled: boolean
  description: string
}
