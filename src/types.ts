export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  /**
   * system search result
   */
  organic?: Array<any>
}

export interface ErrorMessage {
  code: string
  message: string
}
