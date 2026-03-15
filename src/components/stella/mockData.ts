import { Message, Conversation, PipelineStage, ModelRoute, OllamaModel } from './types';

export const mockMessages: Message[] = [
  {
    id: '1',
    role: 'stella',
    content: 'Good evening, Shai. What are we working on today?',
    timestamp: '9:42 PM',
  },
  {
    id: '2',
    role: 'user',
    content: 'I have an idea about AI and fabrics — like smart clothing that adapts',
    timestamp: '9:43 PM',
  },
  {
    id: '3',
    role: 'stella',
    content: "That's a rich space — sits at the intersection of materials science, IoT, and fashion tech. There's the manufacturing angle (smart textiles with embedded sensors), the consumer side (adaptive clothing for health or comfort), and a design play (AI-generated patterns). Chennai's textile industry could be interesting here too.\n\nWant me to dig into this, build something around it, or both?",
    timestamp: '9:43 PM',
    showActions: true,
  },
  {
    id: '4',
    role: 'stella',
    content: '',
    timestamp: '9:44 PM',
    showRunCard: true,
    pipelineType: 'research',
  },
];

export const researchStages: PipelineStage[] = [
  { name: 'Clarification', status: 'completed', elapsed: '4s' },
  { name: 'Question decomposition', status: 'completed', elapsed: '8s' },
  { name: 'Source collection', status: 'completed', elapsed: '23s' },
  { name: 'Claim extraction', status: 'active' },
  { name: 'Contradiction detection', status: 'pending' },
  { name: 'Synthesis', status: 'pending' },
  { name: 'Report assembly', status: 'pending' },
  { name: 'Export', status: 'pending' },
];

export const buildStages: PipelineStage[] = [
  { name: 'Clarification', status: 'pending' },
  { name: 'Architecture plan', status: 'pending' },
  { name: 'Task breakdown', status: 'pending' },
  { name: 'Scaffold plan', status: 'pending' },
  { name: 'Patch generation', status: 'pending' },
  { name: 'Test checklist', status: 'pending' },
  { name: 'Critic review', status: 'pending' },
  { name: 'Export', status: 'pending' },
];

export const mockConversations: Conversation[] = [
  { id: 'conv-1', title: 'AI & Smart Fabrics Research', timestamp: '2 min ago' },
  { id: 'conv-2', title: 'Chennai Startup Ecosystem', timestamp: 'Yesterday' },
  { id: 'conv-3', title: 'Voice Interface Architecture', timestamp: '2 days ago' },
  { id: 'conv-4', title: 'Stella Memory System Design', timestamp: 'Mar 12' },
  { id: 'conv-5', title: 'Weekly Review & Planning', timestamp: 'Mar 10' },
];

export const modelRoutes: ModelRoute[] = [
  { stage: 'Conversational', model: 'claude-sonnet-4-5', type: 'Cloud' },
  { stage: 'Research stages 1–5', model: 'qwen2.5:7b', type: 'Local' },
  { stage: 'Research synthesis', model: 'claude-sonnet-4-5', type: 'Cloud' },
  { stage: 'Build architecture', model: 'devstral-small-2', type: 'Local' },
  { stage: 'Build code gen + critic', model: 'claude-sonnet-4-5', type: 'Cloud' },
  { stage: 'Embeddings', model: 'nomic-embed-text', type: 'Local' },
];

export const ollamaModels: OllamaModel[] = [
  { name: 'qwen2.5:7b', size: '4.7GB', status: 'active' },
  { name: 'devstral-small-2', size: '15GB', status: 'active' },
  { name: 'qwen3-coder:30b', size: '18GB', status: 'active' },
  { name: 'nomic-embed-text', size: '274MB', status: 'active' },
];

export const monthlyStats = {
  totalRuns: 14,
  totalCost: '$1.23',
  costLimit: '$50.00',
  costPercent: 2.46,
  tokensUsed: '48,200',
};
