import { useState, useEffect, useRef } from 'react';

// Types
interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  icon: string;
  color: string;
  description: string;
  endpoint: string;
  keyName: string;
  headersFn: (key: string) => Record<string, string>;
  bodyFn: (messages: AIMessage[]) => Record<string, unknown>;
  responseFn: (data: Record<string, unknown>) => string;
}

interface Conversation {
  id: string;
  modelId: string;
  title: string;
  messages: AIMessage[];
  createdAt: Date;
}

// AI Models Configuration
const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    icon: '🧠',
    color: 'from-green-500 to-emerald-600',
    description: 'Most capable GPT-4 model',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyName: 'openai_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'gpt-4o',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    icon: '⚡',
    color: 'from-green-400 to-teal-500',
    description: 'Fast & affordable',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyName: 'openai_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'gpt-4o-mini',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    icon: '🎭',
    color: 'from-orange-500 to-amber-600',
    description: 'Balanced & creative',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyName: 'anthropic_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
    bodyFn: (messages) => ({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
    responseFn: (data) => (data.content as {text: string}[])[0].text,
  },
  {
    id: 'claude-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    icon: '🌸',
    color: 'from-pink-500 to-rose-500',
    description: 'Fast responses',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyName: 'anthropic_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
    bodyFn: (messages) => ({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
    responseFn: (data) => (data.content as {text: string}[])[0].text,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    icon: '✨',
    color: 'from-blue-500 to-indigo-600',
    description: 'Google\'s latest AI',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    keyName: 'google_api_key',
    headersFn: () => ({
      'Content-Type': 'application/json',
    }),
    bodyFn: (messages) => ({
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    }),
    responseFn: (data) => ((data.candidates as {content: {parts: {text: string}[]}}[])[0].content.parts[0]).text,
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral',
    icon: '🌪️',
    color: 'from-cyan-500 to-blue-600',
    description: 'European AI excellence',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    keyName: 'mistral_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'mistral-large-latest',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    icon: '🔮',
    color: 'from-purple-500 to-violet-600',
    description: 'Powerful reasoning',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyName: 'deepseek_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'deepseek-chat',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'groq-llama',
    name: 'Llama 3.1 70B',
    provider: 'Groq',
    icon: '🚀',
    color: 'from-red-500 to-orange-500',
    description: 'Ultra-fast inference',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyName: 'groq_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'llama-3.1-70b-versatile',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'xiaomi-mimo',
    name: 'MiMo-V2-Pro',
    provider: 'Xiaomi',
    icon: '📱',
    color: 'from-orange-500 to-yellow-500',
    description: 'Xiaomi\'s flagship AI with 1M context',
    endpoint: 'https://api.xiaomimimo.com/v1/chat/completions',
    keyName: 'xiaomi_mimo_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'mimo-v2-pro',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'xiaomi-mimo-flash',
    name: 'MiMo-V2-Flash',
    provider: 'Xiaomi',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-400',
    description: 'Fast & affordable Xiaomi AI',
    endpoint: 'https://api.xiaomimimo.com/v1/chat/completions',
    keyName: 'xiaomi_mimo_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'mimo-v2-flash',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'github-gpt4o',
    name: 'GPT-4o',
    provider: 'GitHub Models',
    icon: '🐙',
    color: 'from-gray-700 to-gray-900',
    description: 'OpenAI GPT-4o via GitHub',
    endpoint: 'https://models.inference.ai.azure.com/v1/chat/completions',
    keyName: 'github_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      max_tokens: 4096,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'github-phi4',
    name: 'Phi-4',
    provider: 'GitHub Models',
    icon: '🐙',
    color: 'from-gray-700 to-gray-900',
    description: 'Microsoft Phi-4 via GitHub',
    endpoint: 'https://models.inference.ai.azure.com/v1/chat/completions',
    keyName: 'github_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'Phi-4',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      max_tokens: 4096,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'github-llama',
    name: 'Llama 3.3 70B',
    provider: 'GitHub Models',
    icon: '🦙',
    color: 'from-gray-700 to-gray-900',
    description: 'Meta Llama via GitHub',
    endpoint: 'https://models.inference.ai.azure.com/v1/chat/completions',
    keyName: 'github_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'Llama-3.3-70B-Instruct',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      max_tokens: 4096,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
  {
    id: 'github-mistral',
    name: 'Mistral Large',
    provider: 'GitHub Models',
    icon: '💨',
    color: 'from-gray-700 to-gray-900',
    description: 'Mistral Large via GitHub',
    endpoint: 'https://models.inference.ai.azure.com/v1/chat/completions',
    keyName: 'github_api_key',
    headersFn: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
    bodyFn: (messages) => ({
      model: 'Mistral-large-2411',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      max_tokens: 4096,
    }),
    responseFn: (data) => (data.choices as {message: {content: string}}[])[0].message.content,
  },
];

// Utility functions
const getStoredKeys = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem('ai_hub_keys') || '{}');
  } catch {
    return {};
  }
};

const storeKeys = (keys: Record<string, string>) => {
  localStorage.setItem('ai_hub_keys', JSON.stringify(keys));
};

const getStoredConversations = (): Conversation[] => {
  try {
    return JSON.parse(localStorage.getItem('ai_hub_conversations') || '[]');
  } catch {
    return [];
  }
};

const storeConversations = (conversations: Conversation[]) => {
  localStorage.setItem('ai_hub_conversations', JSON.stringify(conversations));
};

// Components
function SettingsModal({ 
  isOpen, 
  onClose, 
  apiKeys, 
  setApiKeys 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  apiKeys: Record<string, string>;
  setApiKeys: (keys: Record<string, string>) => void;
}) {
  const [localKeys, setLocalKeys] = useState<Record<string, string>>(apiKeys);

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys, isOpen]);

  const handleSave = () => {
    setApiKeys(localKeys);
    storeKeys(localKeys);
    onClose();
  };

  if (!isOpen) return null;

  const providers = [...new Set(AI_MODELS.map(m => m.provider))];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span> API Keys
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          <p className="text-slate-400 text-sm">
            Your API keys are stored locally on your device and never sent to our servers.
          </p>
          
          {providers.map(provider => {
            const providerModels = AI_MODELS.filter(m => m.provider === provider);
            const keyName = providerModels[0].keyName;
            
            return (
              <div key={provider} className="space-y-2">
                <label className="text-white font-medium flex items-center gap-2">
                  <span>{providerModels[0].icon}</span>
                  {provider}
                </label>
                <input
                  type="password"
                  placeholder={`Enter ${provider} API key...`}
                  value={localKeys[keyName] || ''}
                  onChange={(e) => setLocalKeys({ ...localKeys, [keyName]: e.target.value })}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2 rounded-lg font-medium transition-all"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelSelector({ 
  models, 
  selectedModel, 
  onSelect,
  apiKeys
}: { 
  models: AIModel[]; 
  selectedModel: AIModel; 
  onSelect: (model: AIModel) => void;
  apiKeys: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const modelsWithKeys = models.map(m => ({
    ...m,
    hasKey: !!apiKeys[m.keyName],
  }));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-gradient-to-r ${selectedModel.color} px-4 py-2 rounded-xl text-white font-medium shadow-lg`}
      >
        <span className="text-xl">{selectedModel.icon}</span>
        <span className="hidden sm:inline">{selectedModel.name}</span>
        <span className="text-xs opacity-75">▼</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-72 z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase">Select AI Model</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {modelsWithKeys.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  if (model.hasKey) {
                    onSelect(model);
                    setIsOpen(false);
                  }
                }}
                className={`w-full p-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors ${
                  selectedModel.id === model.id ? 'bg-slate-700/30' : ''
                } ${!model.hasKey ? 'opacity-50' : ''}`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-xl`}>
                  {model.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium flex items-center gap-2">
                    {model.name}
                    {!model.hasKey && <span className="text-xs text-amber-400">🔑</span>}
                  </div>
                  <div className="text-slate-400 text-xs">{model.provider} • {model.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, model }: { message: AIMessage; model?: AIModel }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {!isUser && model && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{model.icon}</span>
            <span className="text-slate-400 text-xs">{model.name}</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
              : 'bg-slate-700/50 text-slate-100 border border-slate-600/50'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className={`text-xs text-slate-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
}: {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-slate-900 border-r border-slate-700/50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-4 border-b border-slate-700/50">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <span className="text-xl">+</span>
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-slate-500 text-xs font-medium uppercase px-3 py-2">Recent Chats</div>
          {conversations.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">
              No conversations yet.<br />Start a new chat!
            </div>
          ) : (
            conversations.map(conv => {
              const model = AI_MODELS.find(m => m.id === conv.modelId);
              return (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conv.id
                      ? 'bg-slate-700/50'
                      : 'hover:bg-slate-800'
                  }`}
                  onClick={() => { onSelectConversation(conv.id); onClose(); }}
                >
                  <span className="text-lg">{model?.icon || '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 text-sm truncate">{conv.title}</div>
                    <div className="text-slate-500 text-xs">{model?.name}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export default function App() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load data on mount
  useEffect(() => {
    setApiKeys(getStoredKeys());
    const stored = getStoredConversations();
    setConversations(stored);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [inputValue]);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      modelId: selectedModel.id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    storeConversations(updated);
    setActiveConversation(newConv);
    return newConv;
  };

  const updateConversation = (conv: Conversation) => {
    const updated = conversations.map(c => c.id === conv.id ? conv : c);
    setConversations(updated);
    storeConversations(updated);
    setActiveConversation(conv);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const apiKey = apiKeys[selectedModel.keyName];
    if (!apiKey) {
      setError(`Please add your ${selectedModel.provider} API key in settings`);
      setShowSettings(true);
      return;
    }

    setError(null);
    const userMessage: AIMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Get or create conversation
    let conv = activeConversation;
    if (!conv || conv.modelId !== selectedModel.id) {
      conv = createNewConversation();
    }

    // Add user message
    const convWithUserMsg = {
      ...conv,
      messages: [...conv.messages, userMessage],
      title: conv.messages.length === 0 ? userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '') : conv.title,
    };
    updateConversation(convWithUserMsg);
    setInputValue('');
    setIsLoading(true);

    try {
      const endpoint = selectedModel.id === 'gemini-pro' 
        ? `${selectedModel.endpoint}?key=${apiKey}`
        : selectedModel.endpoint;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: selectedModel.headersFn(apiKey),
        body: JSON.stringify(selectedModel.bodyFn(convWithUserMsg.messages)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData.error as {message?: string})?.message || `API error: ${response.status}`);
      }

      const data = await response.json() as Record<string, unknown>;
      const assistantContent = selectedModel.responseFn(data);

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      updateConversation({
        ...convWithUserMsg,
        messages: [...convWithUserMsg.messages, assistantMessage],
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const deleteConversation = (id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    storeConversations(updated);
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  };

  const selectConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setActiveConversation(conv);
      const model = AI_MODELS.find(m => m.id === conv.modelId);
      if (model) setSelectedModel(model);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={selectConversation}
        onNewChat={createNewConversation}
        onDeleteConversation={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                AI Hub
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ModelSelector
              models={AI_MODELS}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              apiKeys={apiKeys}
            />
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to AI Hub</h2>
              <p className="text-slate-400 max-w-md mb-6">
                Chat with multiple AI models from one place. No more switching between websites!
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
                {AI_MODELS.slice(0, 4).map(model => (
                  <div
                    key={model.id}
                    className={`p-3 rounded-xl bg-gradient-to-br ${model.color} bg-opacity-10 border border-slate-700/50`}
                  >
                    <div className="text-2xl mb-1">{model.icon}</div>
                    <div className="text-white text-xs font-medium">{model.name}</div>
                  </div>
                ))}
              </div>
              {!Object.keys(apiKeys).length && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all"
                >
                  Add API Keys to Start
                </button>
              )}
            </div>
          ) : (
            <>
              {activeConversation.messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  model={msg.role === 'assistant' ? AI_MODELS.find(m => m.id === activeConversation.modelId) : undefined}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-lg">
          <div className="max-w-4xl mx-auto flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedModel.name}...`}
                rows={1}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                style={{ maxHeight: '150px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`px-4 py-3 rounded-xl font-medium transition-all ${
                inputValue.trim() && !isLoading
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="animate-spin inline-block">⏳</span>
              ) : (
                <span>➤</span>
              )}
            </button>
          </div>
          <div className="max-w-4xl mx-auto mt-2 text-center text-slate-500 text-xs">
            Using {selectedModel.provider} {selectedModel.name} • Press Enter to send
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
      />
    </div>
  );
}
