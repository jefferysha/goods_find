export interface Account {
  name: string
  state_file: string
  status: 'valid' | 'expired' | 'unknown'
  last_check?: string
}
