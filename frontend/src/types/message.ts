export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string | null;
  type: string;
  created_at: string;
  attachments?: { id: string; url: string; type?: string; filename?: string }[];
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  type?: string;
  tempId?: string;
}
