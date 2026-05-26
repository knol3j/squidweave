import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, X, Image as ImageIcon, Sparkles, Loader2, Camera, Copy, Check, 
  Smartphone, Share2, Video, Linkedin, Instagram, Twitter, Columns, Zap,
  Hash, Search, TrendingUp, BarChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useCollaboration } from './CollaborationProvider';
import { dataService, Keyword } from '../services/dataService';

interface ChatPanelProps {
  externalPrompt?: string;
}

export default function ChatPanel({ externalPrompt }: ChatPanelProps) {
  const { messages, sendMessage: syncMessage, campaignState, updateCampaignState } = useCollaboration();
  const enabledModules = campaignState.enabledModules || [];
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalPrompt) {
      setInput(externalPrompt);
    }
  }, [externalPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!campaignState.id) return;
    const unsubscribe = dataService.subscribeToKeywords(campaignState.id, (data) => {
      setKeywords(data);
    });
    return () => unsubscribe();
  }, [campaignState.id]);

  const buildAssistantReport = (prompt: string, result: any) => {
    const campaign = result?.campaign || result?.automation?.decision?.execution?.payload?.context?.campaign || result?.automation?.decision?.execution?.context?.campaign || result?.decision?.execution?.payload?.context?.campaign || result?.decision?.execution?.context?.campaign || campaignState;
    const decision = result?.automation?.decision || result?.decision;
    const contentPack = result?.automation?.contentPack || result?.contentPack;
    const action = decision?.plan?.recommendedAction;
    const policy = result?.policy;
    const executionLog = Array.isArray(result?.executionLog) ? result.executionLog : [];
    const variants = contentPack?.variants || [];
    const firstVariant = variants[0];
    const liveKeywords = keywords.map((keyword) => `- ${keyword.term}`).join('\n');
    const topTargets = decision?.targeting?.topTargets?.slice?.(0, 3) || [];
    const reengagementQueue = decision?.targeting?.reengagementQueue?.slice?.(0, 3) || [];

    return [
      '[Campaign Strategy]:',
      `Campaign objective: ${campaign?.objective || 'Not configured'}.`,
      `Prompt: ${prompt}`,
      `Primary action: ${action?.type || 'No live action'}${action?.reason ? ` because ${action.reason}` : ''}.`,
      `Locales targeted: ${(campaign?.locales || []).join(', ') || 'No locales configured'}.`,
      `Autopilot policy: objective=${policy?.classification?.objectiveMode || 'n/a'}, budget=${policy?.classification?.budgetMode || 'n/a'}${policy?.classification?.budgetAmount != null ? ` (${policy.classification.budgetAmount})` : ''}.`,
      '',
      '[Autopilot Execution Log]:',
      executionLog.length
        ? executionLog.map((entry: any) => `- ${entry.stage}: ${entry.status}${entry.reason ? ` (${entry.reason})` : ''}${entry.processedContacts != null ? ` contacts=${entry.processedContacts}` : ''}${entry.processedInvestors != null ? ` investors=${entry.processedInvestors}` : ''}${entry.channels ? ` channels=${entry.channels.join(',')}` : ''}`).join('\n')
        : '- No execution log available.',
      '',
      '#### Market Realities',
      `Current decision status: ${decision?.policyResult?.status || 'No live status'}.`,
      `ROAS: ${Number((decision?.summary?.derived?.roas || 0)).toFixed(2)}.`,
      `CTR: ${Number(((decision?.summary?.derived?.ctr || 0) * 100)).toFixed(2)}%.`,
      `Top ranked targets: ${topTargets.map((target: any) => `${target.company || target.targetId} (${target.recommendation})`).join(', ') || 'No ranked targets yet'}.`,
      `Reengagement queue: ${reengagementQueue.map((target: any) => `${target.company || target.targetId} via ${target.recommendedChannel || 'unassigned channel'}`).join(', ') || 'No reengagement candidates yet'}.`,
      '',
      '[Ad Copy]:',
      variants.map((variant: any) => `- ${variant.locale}: ${variant.subject} | ${variant.headline}`).join('\n') || '- No localized variants generated yet.',
      '',
      '[Social Media Posts]:',
      variants.map((variant: any) => `- ${variant.locale}: ${variant.body}`).join('\n') || '- Awaiting content generation.',
      '',
      '[Social Media Kit]:',
      firstVariant
        ? `[Instagram Reel]\nHook: ${firstVariant.headline}\nCTA: ${firstVariant.cta}\n\n[Carousel Post]\nSlide 1: ${firstVariant.subject}\nSlide 2: ${firstVariant.preheader}\n\n[LinkedIn Video/Image]\nAngle: ${firstVariant.body}`
        : 'No creative kit generated yet.',
      '',
      '[SEO Keywords]:',
      liveKeywords || '- No live keyword feed connected.',
    ].join('\n');
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;

    const currentInput = input;
    const currentImage = selectedImage;

    // First sync the user message
    await syncMessage('user', currentInput, currentImage || undefined);
    
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      await updateCampaignState({
        activePrompt: currentInput,
        activeTab: 'engine',
        enabledModules,
        automationEnabled: true,
        objective: currentInput,
        baseBody: currentInput,
      });

      const result = await dataService.runPromptAutopilot(currentInput, {
        campaignId: campaignState.id || 'main-campaign',
        reason: currentImage ? 'asset-assisted-ui-request' : 'ui-request',
        locales: campaignState.locales,
      });
      const responseText = buildAssistantReport(currentInput, result);
      await syncMessage('assistant', responseText);
    } catch (error) {
      console.error(error);
      await syncMessage('assistant', "Error: Failed to connect to the marketing engine.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const renderContent = (content: string) => {
    const toolActionRegex = /\[TOOL_ACTION: .*?\]/g;
    const partsWithTools = content.split(toolActionRegex);
    const tools = content.match(toolActionRegex);

    const sections = content.split(/(\[.*?\]:)/g);
    if (sections.length <= 1) {
      // If no main sections, still try to render tool actions in a simple way
      const subParts = content.split(/(\[TOOL_ACTION: .*?\])/g);
      return (
        <div className="space-y-2">
          {subParts.map((part, i) => {
            if (part.startsWith('[TOOL_ACTION:')) {
              const actionText = part.replace('[TOOL_ACTION: ', '').replace(']', '');
              return (
                <div key={i} className="my-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">MCP Automation Triggered</div>
                    <div className="text-xs text-white font-mono">{actionText}</div>
                  </div>
                </div>
              );
            }
            return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sections.map((part, index) => {
          if (part.startsWith('[TOOL_ACTION:')) return null; // Handled by splitting differently if needed, but here we use split by section mostly

          if (part.startsWith('[') && part.endsWith(']:')) {
            const title = part.replace(/[\[\]:]/g, '');
            const isKit = title.includes('Kit') || title.includes('Mixed Media');
            const isStrategy = title.toLowerCase().includes('strategy');
            
            return (
              <div key={index} className={`mt-6 mb-3 flex items-center gap-2 ${isKit ? 'text-indigo-400' : isStrategy ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isStrategy && <Sparkles className="w-3 h-3" />}
                {title.toLowerCase().includes('social') && <Share2 className="w-3 h-3" />}
                {isKit && <Smartphone className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none bg-white/5 px-2 py-1.5 rounded-md border border-white/10 shadow-sm shadow-black/20">
                  {title}
                </span>
              </div>
            );
          }
          
          // Check for sub-sections like [Instagram] inside the text part
          if (part.includes('[Instagram') || part.includes('[Carousel') || part.includes('[LinkedIn') || part.includes('[TOOL_ACTION') || part.includes('#### Market Realities')) {
            const subParts = part.split(/(\[.*?\]|#### .*?\n)/g);
            return (
              <div key={index} className="space-y-4">
                {subParts.map((sub, sIdx) => {
                  if (!sub.trim()) return null;

                  if (sub.startsWith('#### Market Realities')) {
                    return (
                      <div key={sIdx} className="my-4 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl relative overflow-hidden group/market">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/market:opacity-10 transition-opacity">
                          <TrendingUp className="w-16 h-16 text-amber-400" />
                        </div>
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                          <BarChart className="w-3 h-3" />
                          Market Realities & Fact Check
                        </div>
                        <div className="prose prose-invert prose-xs max-w-none text-slate-300">
                          <ReactMarkdown>{sub.replace('#### Market Realities', '')}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  }

                  if (sub.startsWith('[TOOL_ACTION:')) {
                    const actionText = sub.replace('[TOOL_ACTION: ', '').replace(']', '');
                    return (
                      <div key={sIdx} className="my-1 p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3">
                        <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <div className="text-[9px] text-white font-mono">{actionText}</div>
                      </div>
                    );
                  }
                  if (sub.startsWith('[') && sub.endsWith(']')) {
                    const subTitle = sub.replace(/[\[\]]/g, '');
                    return (
                      <div key={sIdx} className="flex items-center gap-2 text-indigo-400 mt-6 first:mt-2">
                        {subTitle.includes('Instagram') && <Instagram className="w-3 h-3 text-fuchsia-400" />}
                        {subTitle.includes('TikTok') && <Video className="w-3 h-3 text-emerald-400" />}
                        {subTitle.includes('LinkedIn') && <Linkedin className="w-3 h-3 text-blue-400" />}
                        {subTitle.includes('Carousel') && <Columns className="w-3 h-3 text-indigo-400" />}
                        <span className="text-[9px] font-bold underline underline-offset-4 decoration-indigo-500/30 uppercase tracking-widest">{subTitle}</span>
                      </div>
                    );
                  }
                  return <div key={sIdx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 shadow-inner"><ReactMarkdown>{sub}</ReactMarkdown></div>;
                })}
              </div>
            );
          }

          return <ReactMarkdown key={index}>{part}</ReactMarkdown>;
        })}
      </div>
    );
  };

  return (
    <div 
      className={`flex flex-col h-full transition-colors ${isDragging ? 'bg-indigo-500/5' : 'bg-transparent'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 backdrop-blur-md ${
                msg.role === 'user' 
                  ? 'bg-indigo-600/40 border border-indigo-400/30 text-white shadow-lg shadow-indigo-500/10' 
                  : 'bg-white/5 border border-white/10 text-slate-200'
              }`}>
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="Uploaded" 
                    className="max-w-full rounded-xl mb-3 border border-white/10 shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed group/msg relative">
                  {msg.role === 'assistant' ? renderContent(msg.content) : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                  
                  {msg.role === 'assistant' && (
                    <button 
                      onClick={() => copyToClipboard(msg.content, i)}
                      className="absolute -top-4 -right-4 bg-slate-800 border border-white/10 rounded-lg p-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity hover:bg-slate-700 shadow-xl"
                    >
                      {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-xs font-mono text-slate-500 italic">SYSTEM processing vision tokens...</span>
            </div>
          </div>
        )}
      </div>

      {/* Keywords Ticker */}
      <AnimatePresence>
        {keywords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-6 py-2 overflow-hidden bg-[#020617]/20 border-t border-white/5"
          >
            <div className="flex items-center gap-4 animate-ticker whitespace-nowrap">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-widest shrink-0">
                <Search className="w-3 h-3" />
                SEO Search Intent:
              </div>
              <div className="flex items-center gap-6">
                {keywords.map((kw) => (
                  <button 
                    key={kw.id} 
                    onClick={() => navigator.clipboard.writeText(kw.term)}
                    className="flex items-center gap-2 group cursor-pointer"
                  >
                    <Hash className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-[11px] font-mono text-slate-400 group-hover:text-white transition-colors">{kw.term}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-bold group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">{kw.volume}</span>
                  </button>
                ))}
              </div>
              {/* Duplicate for seamless loop if needed, but for now simple flex with gap is fine */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-2 md:p-4 mx-2 md:mx-4 mb-2 md:mb-4 bg-white/10 border border-white/20 backdrop-blur-2xl rounded-2xl md:rounded-3xl shadow-2xl z-30 shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 text-slate-400 border-b border-white/5 pb-1 px-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-[9px] uppercase font-bold tracking-widest hover:text-white transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Reference
            </button>
            <div className="ml-auto font-mono text-[9px] opacity-30 hidden sm:block">CMD+K FOR SHORTCUTS</div>
          </div>

          <div className="max-w-none relative flex items-center gap-4 px-2">
            <AnimatePresence>
              {selectedImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute -top-32 left-0 p-2 bg-white/10 border border-white/20 backdrop-blur-md rounded-xl shadow-2xl"
                >
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg" referrerPolicy="no-referrer" />
                </motion.div>
              )}
            </AnimatePresence>

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe campaign target or upload product assets..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-sm py-2"
            />
            
            <button 
              onClick={handleSend}
              disabled={loading || (!input.trim() && !selectedImage)}
              className="w-10 h-10 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:hover:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all shrink-0"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
