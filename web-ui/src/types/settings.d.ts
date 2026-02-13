export interface NotificationSettings {
  ntfy_topic_url: string
  bark_url: string
  wx_bot_url: string
  telegram_bot_token: string
  telegram_chat_id: string
  webhook_url: string
}

export interface AiSettings {
  openai_api_key: string
  openai_base_url: string
  openai_model_name: string
}

export interface ProxySettings {
  proxy_url: string
  proxy_rotation_enabled: boolean
  proxy_pool: string
}
