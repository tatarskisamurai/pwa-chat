export interface Chat {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  display_name?: string | null;  // для личного чата — имя собеседника
  created_at: string;
  members_count?: number;
  last_message?: {
    id: string;
    content: string | null;
    created_at: string;
  } | null;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string | null;
  type: string;
  created_at: string;
  attachments?: { id: string; url: string; type?: string; filename?: string }[];
}

export interface Attachment {
  id: string;
  url: string;
  type?: string;
  filename?: string;
}
