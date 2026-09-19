import type { Role } from '../types'

/** 演示账号，对应 db/data.sql，密码统一 123456。登录响应不含大区，这里补上「数据范围」供侧栏和顶栏展示。 */
export interface DemoAccount {
  repId: number
  name: string
  role: Role
  roleLabel: string
  scope: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { repId: 13, name: '黄总', role: 'SALES_DIRECTOR', roleLabel: '销售总监', scope: '全公司数据' },
  { repId: 1, name: '李明', role: 'SALES_MANAGER', roleLabel: '销售经理', scope: '华东区' },
  { repId: 2, name: '张伟', role: 'SALES_REP', roleLabel: '销售员', scope: '仅本人数据' },
]

export const ROLE_LABEL: Record<Role, string> = {
  SALES_DIRECTOR: '销售总监',
  SALES_MANAGER: '销售经理',
  SALES_REP: '销售员',
}

/** 已知账号按 repId 查范围；未知账号按角色给通用描述 */
const SCOPE_BY_REP_ID: Record<number, string> = {
  13: '全公司数据',
  1: '华东区',
  4: '华南区',
  7: '华北区',
  10: '西南区',
}

export function resolveScope(repId: number, role: Role): string {
  const known = SCOPE_BY_REP_ID[repId]
  if (known) return known
  if (role === 'SALES_DIRECTOR') return '全公司数据'
  if (role === 'SALES_REP') return '仅本人数据'
  return '所辖大区'
}
