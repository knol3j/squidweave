import React from 'react';
import { Sparkles, Share2, Smartphone, TrendingUp, BarChart, Zap, Instagram, Video, Linkedin, Columns } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function renderContent(content: string): React.ReactElement {
  const sections = content.split(/(\[.*?\]:)/g);
  if (sections.length <= 1) {
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
        if (part.startsWith('[TOOL_ACTION:')) return null;

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
                      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
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
}
