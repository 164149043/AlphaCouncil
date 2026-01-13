import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AgentConfig, AgentRole } from '../types';
import * as Icons from 'lucide-react';
import { MODEL_OPTIONS } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

// 机械键盘音效
const KEYPRESS_SOUND = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; 

interface AgentCardProps {
  config: AgentConfig;
  content?: string;
  isLoading: boolean;
  isPending: boolean;
  isConfigMode: boolean;
  onConfigChange: (newConfig: AgentConfig) => void;
}

// 提取 JSON 的辅助函数
const extractJson = (text: string) => {
  const regex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(regex);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("JSON parse failed", e);
    }
  }
  return null;
};

// 移除 Markdown 中的代码块用于显示文本
const removeCodeBlock = (text: string) => {
  return text.replace(/```json[\s\S]*?```/g, '').trim();
};

const AgentCard: React.FC<AgentCardProps> = ({ config, content, isLoading, isPending, isConfigMode, onConfigChange }) => {
  const Icon = Icons[config.icon as keyof typeof Icons] as React.ElementType;
  
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [chartData, setChartData] = useState<any>(null);

  // 需要强制使用 Google Search 的智能体角色（Gemini）
  const GEMINI_AGENTS = [AgentRole.MACRO, AgentRole.INDUSTRY, AgentRole.FUNDS];
  const isGeminiAgent = GEMINI_AGENTS.includes(config.id);
  
  // 其他智能体强制使用 DeepSeek
  const isDeepSeekAgent = !isGeminiAgent;

  useEffect(() => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playTypingSound = () => {
    if (!audioContextRef.current) return;
    try {
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime); 
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  };

  useEffect(() => {
    if (isLoading || isPending || isConfigMode || !content) {
        setDisplayedContent("");
        setChartData(null);
        setIsTyping(false);
        return;
    }

    // 1. 尝试提取图表数据
    const extractedChart = extractJson(content);
    if (extractedChart) {
        setChartData(extractedChart);
    }

    // 2. 准备纯文本内容（去除 JSON 代码块）
    const cleanText = removeCodeBlock(content);

    if (cleanText === displayedContent) return;

    setIsTyping(true);
    let currentIndex = 0;
    const typingSpeed = 50; // 更快的打字速度
    
    setDisplayedContent(""); 

    const intervalId = setInterval(() => {
        if (currentIndex < cleanText.length) {
            const step = Math.floor(Math.random() * 5) + 2; // 打字步长加大
            const nextIndex = Math.min(currentIndex + step, cleanText.length);
            setDisplayedContent(cleanText.substring(0, nextIndex));
            currentIndex = nextIndex;
            if (Math.random() > 0.7) playTypingSound();
        } else {
            setIsTyping(false);
            clearInterval(intervalId);
        }
    }, typingSpeed);

    return () => clearInterval(intervalId);
  }, [content, isLoading, isPending, isConfigMode]);

  // 颜色映射
  const colorMap: Record<string, string> = {
    slate: 'border-slate-500/30 bg-slate-900/40 text-slate-200 shadow-slate-900/20',
    cyan: 'border-cyan-500/30 bg-cyan-900/40 text-cyan-200 shadow-cyan-900/20',
    violet: 'border-violet-500/30 bg-violet-900/40 text-violet-200 shadow-violet-900/20',
    emerald: 'border-emerald-500/30 bg-emerald-900/40 text-emerald-200 shadow-emerald-900/20',
    blue: 'border-blue-500/30 bg-blue-900/40 text-blue-200 shadow-blue-900/20',
    indigo: 'border-indigo-500/30 bg-indigo-900/40 text-indigo-200 shadow-indigo-900/20',
    fuchsia: 'border-fuchsia-500/30 bg-fuchsia-900/40 text-fuchsia-200 shadow-fuchsia-900/20',
    orange: 'border-orange-500/30 bg-orange-900/40 text-orange-200 shadow-orange-900/20',
    amber: 'border-amber-500/30 bg-amber-900/40 text-amber-200 shadow-amber-900/20',
    red: 'border-red-500/30 bg-red-900/40 text-red-200 shadow-red-900/20',
  };
  const styleClass = colorMap[config.color] || colorMap.slate;

  // 渲染图表
  const renderChart = () => {
    if (!chartData) return null; // 没有图表数据
    if (isTyping) return null; // 打字机动画期间不渲染图表
    if (isLoading || isPending) return null; // 加载或等待期间不渲染

    if (chartData.chartType === 'bar') {
        return (
            <div className="h-40 w-full mt-4 animate-fade-in">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={160}>
                    <BarChart data={chartData.data}>
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px'}} 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {chartData.data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#06b6d4' : '#3b82f6'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
    
    if (chartData.chartType === 'radar') {
         return (
            <div className="h-40 w-full mt-4 animate-fade-in">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={160}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData.data}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fill: '#94a3b8'}} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                        <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px'}} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
         );
    }
    return null;
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = MODEL_OPTIONS.find(m => m.name === e.target.value);
    if (selected) {
      onConfigChange({ ...config, modelProvider: selected.provider, modelName: selected.name });
    }
  };
  
  // 动态温度颜色
  const getTempColor = (t: number) => {
    if (t <= 0.3) return 'text-blue-400';
    if (t >= 0.7) return 'text-red-400';
    return 'text-amber-400';
  };

  // 等待状态
  if (isPending && !isConfigMode) {
    return (
      <div className="h-full min-h-[120px] rounded-xl border border-slate-800 bg-slate-900/20 p-4 flex flex-col items-center justify-center opacity-40">
        <Icon className="w-6 h-6 mb-2 text-slate-600" />
        <h3 className="text-xs font-semibold text-slate-500 text-center">{config.title}</h3>
        <p className="text-[10px] text-slate-600 mt-1">等待分析...</p>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col rounded-xl border backdrop-blur-sm transition-all duration-300 ${styleClass} ${isLoading ? 'animate-pulse' : 'hover:shadow-lg hover:shadow-blue-900/10'} h-full overflow-hidden`}>
      {/* 头部 */}
      <div className="flex items-center gap-2 p-3 border-b border-white/5 shrink-0 bg-black/10">
        <div className={`p-1.5 rounded-lg bg-white/5`}>
            <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold tracking-wide uppercase opacity-90 truncate leading-tight">{config.title}</h3>
          <p className="text-[10px] opacity-60 truncate leading-tight mt-0.5">{config.name}</p>
        </div>
        {!isConfigMode && (
          <div className="ml-auto flex flex-col items-end gap-0.5">
             {config.modelProvider === 'gemini' ? (
                 <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">联网搜索</span>
             ) : (
                 <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 opacity-70">逻辑推演</span>
             )}
          </div>
        )}
      </div>

      {/* 配置面板 */}
      {isConfigMode && (
        <div className="p-3 border-b border-white/5 bg-black/20 space-y-3 shrink-0">
           {/* 随机性滑块 - 美化版 */}
           <div className="bg-slate-900/40 p-2 rounded-lg border border-white/5">
             <div className="flex justify-between items-center mb-2">
               <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider flex items-center gap-1">
                 随机性 (Temp)
               </span>
               <span className={`text-xs font-mono font-bold ${getTempColor(config.temperature)}`}>
                 {config.temperature.toFixed(1)}
               </span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-600 font-mono">严谨</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={config.temperature}
                  onChange={(e) => onConfigChange({ ...config, temperature: parseFloat(e.target.value) })}
                  className="custom-range flex-1"
                />
                <span className="text-[9px] text-slate-600 font-mono">发散</span>
             </div>
           </div>

           {/* 模型选择 */}
           <div>
             <div className="text-[10px] uppercase text-slate-400 mb-1 ml-0.5">模型 (Model)</div>
             <select
               value={config.modelName}
               onChange={handleModelChange}
               className="w-full bg-slate-900/50 text-xs text-slate-300 border border-white/5 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
             >
               {MODEL_OPTIONS.map(option => (
                 <option key={option.name} value={option.name}>
                   {option.label}
                 </option>
               ))}
             </select>
           </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 p-3 md:p-4 overflow-y-auto custom-scrollbar min-h-[120px] relative">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-2 bg-white/10 rounded w-3/4 animate-pulse"></div>
            <div className="h-2 bg-white/10 rounded w-1/2 animate-pulse"></div>
            <div className="h-2 bg-white/10 rounded w-full animate-pulse"></div>
          </div>
        ) : displayedContent ? (
          <div className="flex flex-col h-full">
            <div className="prose prose-invert prose-sm prose-headings:text-inherit prose-headings:font-bold prose-headings:text-xs prose-headings:uppercase prose-headings:tracking-wider prose-headings:my-2 prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-li:my-0.5 text-opacity-90">
                <ReactMarkdown>{displayedContent}</ReactMarkdown>
                {isTyping && <span className="inline-block w-1.5 h-3 bg-current ml-1 animate-pulse align-middle opacity-50"></span>}
            </div>
            {/* 图表渲染区 */}
            {!isTyping && renderChart()}
          </div>
        ) : isConfigMode ? (
            <div className="text-[10px] opacity-40 italic h-full flex flex-col justify-end pb-2">
                <p>{config.description}</p>
            </div>
        ) : (
           <div className="flex items-center justify-center h-full text-[10px] opacity-30 italic">
             等待数据...
           </div>
        )}
      </div>
    </div>
  );
};

export default AgentCard;
