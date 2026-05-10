import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Share2, Smartphone, Globe, MessageSquare, 
  Eye, Zap, ListChecks, ArrowRight, Instagram, Linkedin, Video, ExternalLink
} from 'lucide-react';
import { useCollaboration } from './CollaborationProvider';
import ReactMarkdown from 'react-markdown';
import { dataService, ResearchRecord } from '../services/dataService';

export default function CampaignPreview() {
  const { messages, campaignState } = useCollaboration();
  const [researchRecords, setResearchRecords] = React.useState<ResearchRecord[]>([]);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const records = await dataService.getResearchRecords(campaignState.id || 'main-campaign');
        if (active) {
          setResearchRecords(records);
        }
      } catch (error) {
        console.error(error);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [campaignState.id]);
  
  // Find the last assistant message that looks like a campaign
  const lastCampaign = [...messages].reverse().find(m => 
    m.role === 'assistant' && m.content.includes('[Campaign Strategy]')
  );

  if (!lastCampaign) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
        <div className="p-4 bg-white/5 rounded-full">
          <Sparkles className="w-8 h-8 text-indigo-400/50" />
        </div>
        <p className="text-sm font-medium">Generate a campaign strategy to see the preview.</p>
      </div>
    );
  }

  // Parse sections for a cleaner preview
  const sections = lastCampaign.content.split(/(\[.*?\]:)/g);
  const enabledModules = campaignState.enabledModules || [];
  const liveAssets = researchRecords
    .slice()
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, 2);
  
  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 bg-[#0F172A]/50">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Campaign Execution Blueprint
            </h2>
            <p className="text-slate-400 mt-1">Unified view of your automated marketing strategy.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Ready for Deployment</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Strategy Column */}
          <div className="lg:col-span-2 space-y-8">
            {sections.map((part, idx) => {
              if (part.startsWith('[') && part.endsWith(']:')) {
                const title = part.replace(/[\[\]:]/g, '');
                const content = sections[idx + 1];
                
                if (title.toLowerCase().includes('strategy')) {
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.03] border border-white/10 rounded-[32px] p-8 space-y-6"
                    >
                      <div className="flex items-center gap-3 text-indigo-400 border-b border-white/5 pb-4">
                        <Zap className="w-5 h-5" />
                        <h3 className="text-lg font-bold tracking-tight uppercase text-white">{title}</h3>
                      </div>
                      <div className="markdown-body prose prose-invert prose-sm max-w-none text-slate-300">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    </motion.div>
                  );
                }
                
                if (title.toLowerCase().includes('ad copy') || title.toLowerCase().includes('social')) {
                  return (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 space-y-4"
                    >
                      <div className="flex items-center gap-2 text-fuchsia-400">
                        {title.toLowerCase().includes('copy') ? <MessageSquare className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
                      </div>
                      <div className="prose prose-invert prose-xs text-slate-400">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    </motion.div>
                  );
                }
              }
              return null;
            })}
          </div>

          {/* Right Column: Platform Visuals & Kit */}
          <div className="space-y-6">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[28px] p-6 space-y-6">
              <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Smartphone className="w-3 h-3" /> Creative Assets Kit
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-fuchsia-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight">Instagram Reel</span>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold">READY</span>
                  </div>
                  <div className="w-full aspect-[9/16] bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden group">
                    {liveAssets[0] ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/60 via-slate-900 to-slate-950 p-4 text-left">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">{liveAssets[0].segment || 'Live segment'}</div>
                        <div className="mt-3 text-lg font-semibold text-white">{liveAssets[0].company || liveAssets[0].targetId}</div>
                        <div className="mt-3 space-y-1 text-[11px] text-slate-200">
                          {(liveAssets[0].metadata?.evidence || []).slice(0, 3).map((item, index) => (
                            <div key={`reel-evidence-${index}`}>{item}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Video className="w-8 h-8 text-white/20 absolute" />
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-blue-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight">LinkedIn Post</span>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold">READY</span>
                  </div>
                  <div className="w-full aspect-video bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden group">
                    {liveAssets[1] ? (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 p-4 text-left">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">{liveAssets[1].preferredChannel || 'Live channel'}</div>
                          {liveAssets[1].metadata?.sourceUrl && (
                            <a href={liveAssets[1].metadata.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-200">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="mt-3 text-base font-semibold text-white">{liveAssets[1].notes || liveAssets[1].company || liveAssets[1].targetId}</div>
                        <div className="mt-3 text-[11px] text-slate-200">
                          Intent {(typeof liveAssets[1].intentScore === 'number' ? Math.round(liveAssets[1].intentScore * 100) : 0)}% · Fit {(typeof liveAssets[1].fitScore === 'number' ? Math.round(liveAssets[1].fitScore * 100) : 0)}%
                        </div>
                      </div>
                    ) : (
                      <Share2 className="w-8 h-8 text-white/20 absolute" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ListChecks className="w-3 h-3" /> Distribution Checklist
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Platform Optimization', status: true },
                  { label: 'Pixel Tracking Setup', status: enabledModules.includes('AdSync') || enabledModules.includes('PixelRetarget') },
                  { label: 'A/B Test Routing', status: true },
                  { label: 'Compliance & Tone Check', status: enabledModules.includes('CopySentinel') },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">{item.label}</span>
                    {item.status ? (
                      <div className="w-4 h-4 bg-emerald-500/20 rounded flex items-center justify-center">
                        <ArrowRight className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 bg-amber-500/10 rounded flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Clock(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
