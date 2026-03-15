export interface Message {
  id: string;
  role: 'stella' | 'user';
  content: string;
  timestamp: string;
  showActions?: boolean;
  showRunCard?: boolean;
  pipelineType?: 'research' | 'build';
  runId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: string;
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
