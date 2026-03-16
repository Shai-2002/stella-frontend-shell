export interface Message {
  id: string;
  role: 'stella' | 'user';
  content: string;
  timestamp: string;
  showActions?: boolean;
  showRunCard?: boolean;
  pipelineType?: 'research' | 'build';
  runId?: string;
  showChainCard?: boolean;
  chainId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  project_id?: string | null;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  created_at: string;
  updated_at?: string;
  conversation_count?: number;
  file_count?: number;
}

export interface ProjectFile {
  id: string;
  original_name: string;
  file_type: string;
  status: string;
  chunk_count?: number;
  summary?: string;
  scope: 'chat' | 'project';
  uploaded_at: string;
}

export interface PipelineStage {
  name: string;
  status: 'completed' | 'active' | 'pending';
  elapsed?: string;
}

export interface ModelRoute {
  stage: string;
  model: string;
  type: 'Local' | 'Cloud';
}

export interface OllamaModel {
  name: string;
  size: string;
  status: 'active' | 'inactive';
}
