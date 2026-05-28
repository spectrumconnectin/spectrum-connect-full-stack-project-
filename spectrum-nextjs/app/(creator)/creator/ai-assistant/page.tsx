'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const SUGGESTIONS = [
  'Help me write a professional proposal for a branding project',
  'How should I price a 30-second product video?',
  'Write a follow-up email after submitting a quote',
  'What should I include in my creator portfolio?',
  'Help me respond to a client requesting a discount',
];

const mockResponses: Record<string, string> = {
  default: "I'm your Spectrum Connect AI assistant. I can help you write proposals, craft client emails, price your services, improve your profile, and more. What would you like help with today?",
};

function getMockResponse(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('proposal') || msg.includes('brief')) {
    return `Here's a professional proposal structure for your project:\n\n**Project Proposal**\n\n**Understanding Your Brief**\nBased on our conversation, I understand you're looking for [specific deliverable]. This aligns with my experience in [relevant skill area].\n\n**My Approach**\n1. Discovery & research phase (Days 1–3)\n2. Concept development (Days 4–7)\n3. Refinement & revisions (Days 8–12)\n4. Final delivery (Day 14)\n\n**Investment**\n[Service] — $[amount]\nIncludes: [list of deliverables]\n\n**Why Me**\nI've completed [X] similar projects with an average client rating of [rating]. Here are 2 relevant examples: [link 1], [link 2]\n\nWould you like me to tailor this for a specific type of project?`;
  }
  if (msg.includes('price') || msg.includes('rate') || msg.includes('cost')) {
    return `Great question on pricing! Here's a framework:\n\n**For a 30-second product video:**\n- **Budget tier:** $500–$1,200 (basic filming, standard edit)\n- **Mid-range:** $1,500–$3,000 (professional equipment, motion graphics, revisions)\n- **Premium:** $3,500–$8,000+ (director, crew, professional colour grade, sound design)\n\n**Factors that affect price:**\n- Script writing included?\n- On-location vs. studio shoot?\n- Number of revision rounds\n- Usage rights (social only vs. broadcast)\n- Turnaround time\n\nA good rule of thumb: day rate × estimated days + 20% for admin & communication. What's your current hourly rate?`;
  }
  if (msg.includes('email') || msg.includes('follow')) {
    return `Here's a follow-up email template:\n\n---\n**Subject:** Following up on my proposal for [Project Name]\n\nHi [Client Name],\n\nI hope this finds you well. I wanted to follow up on the proposal I sent over on [date].\n\nI'm excited about the possibility of working on [project name] — I think we'd make a great fit. If you have any questions about my approach or pricing, I'm happy to jump on a quick call.\n\nI'm currently keeping my schedule open until [date] for this project, so please let me know if you'd like to move forward.\n\nLooking forward to hearing from you.\n\nBest,\n[Your name]\n\n---\n\nTip: Keep follow-ups short and add one clear call-to-action. Send no more than 2 follow-ups before moving on.`;
  }
  if (msg.includes('portfolio')) {
    return `A strong creator portfolio should include:\n\n**Must-haves:**\n✅ 6–12 of your best pieces (quality > quantity)\n✅ Brief case studies: problem → your solution → results\n✅ Client names or logos (with permission)\n✅ Measurable outcomes where possible (views, conversion rates, etc.)\n✅ Clear contact / hire me CTA\n\n**Nice to haves:**\n⭐ A short "about me" video\n⭐ Testimonials from past clients\n⭐ Behind-the-scenes process shots\n⭐ Skills & tools you use\n\n**Platforms to consider:**\nBehance (design), Vimeo (video), Contra (all-in-one), your own domain\n\nWould you like help writing a bio or case study for a specific project?`;
  }
  if (msg.includes('discount')) {
    return `Here's how to handle a discount request professionally:\n\n**Option A — Soft decline:**\n"Thank you for your interest! My rates reflect the quality and turnaround I deliver. I'm not able to reduce the price on this scope, but I'd love to find a version that works within your budget — perhaps a smaller initial package?"\n\n**Option B — Reduce scope instead:**\n"I can work within $[lower budget] if we adjust the scope to [X deliverable instead of Y]. Would that work for your needs?"\n\n**Option C — Defer value:**\n"I'm not offering discounts at the moment, but if you'd like to book a second project at the same time, I can price the package favourably."\n\n**Key principle:** Never just drop your rate — it devalues your work and sets a precedent. Always give something in return or maintain your price with confidence.`;
  }
  return `That's a great question! I can help you with:\n\n- Writing proposals and creative briefs\n- Pricing and rate advice\n- Client communication templates\n- Portfolio and profile tips\n- Project management advice\n\nCould you give me a bit more detail about what you're working on? I'll give you the most relevant advice.`;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: mockResponses.default, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // TODO: POST /ai/chat { message: content, conversation_history: messages }
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: getMockResponse(content),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatContent = (text: string) => {
    // Basic markdown-like formatting
    return text
      .split('\n')
      .map((line, i) => {
        const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
          return `<p key="${i}" style="font-weight:700;margin:8px 0 4px">${bold}</p>`;
        }
        if (line.match(/^[✅⭐—•-]/)) return `<p key="${i}" style="margin:2px 0;padding-left:4px">${bold}</p>`;
        if (line.trim() === '') return `<br key="${i}"/>`;
        return `<p key="${i}" style="margin:3px 0">${bold}</p>`;
      })
      .join('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[560px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cobalt to-blue-400 flex items-center justify-center shadow-sm">
            <i className="fa-solid fa-robot text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Creative Assistant</h1>
            <p className="text-sm text-gray-500">Ask anything about proposals, pricing, client comms, and more.</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full font-medium">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Online
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cobalt to-blue-400 flex items-center justify-center shrink-0 mt-1">
                  <i className="fa-solid fa-robot text-white text-xs"></i>
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'bg-cobalt text-white' : 'bg-gray-50 text-gray-800'} rounded-2xl px-4 py-3`}>
                {msg.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed prose prose-sm" dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(msg.timestamp)}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg" alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cobalt to-blue-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-robot text-white text-xs"></i>
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-6 pb-4">
            <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Suggested prompts</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-xs px-3 py-2 bg-blue-50 text-cobalt rounded-xl font-medium hover:bg-blue-100 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cobalt resize-none leading-relaxed"
              placeholder="Ask anything about proposals, pricing, client emails…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              style={{ maxHeight: 120, overflowY: 'auto' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 ${!input.trim() || loading ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-cobalt text-white hover:bg-blue-700 shadow-sm'}`}>
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
