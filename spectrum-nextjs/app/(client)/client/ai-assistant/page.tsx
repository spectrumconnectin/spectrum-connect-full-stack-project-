'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  time: string;
};

const suggestedPrompts = [
  'How do I write a great project brief?',
  'What budget should I set for a logo design?',
  'How do I evaluate creator proposals?',
  'What should I include in my project timeline?',
  'How does the milestone payment system work?',
  'Tips for giving feedback to a creator',
];

function getMiyaResponse(input: string): string {
  const q = input.toLowerCase();

  if (q.includes('brief') || q.includes('project brief')) {
    return `A great project brief sets you up for success. Here's what to include:\n\n**Project overview** — what you're building and why it matters.\n**Goals & success metrics** — what does "done well" look like?\n**Target audience** — who will use or see this?\n**Deliverables** — specific files, formats, or outcomes you expect.\n**Timeline & milestones** — key dates with some buffer built in.\n**Brand assets** — logos, color palettes, fonts, tone of voice guide.\n\nThe more detail you give upfront, the fewer revision rounds you'll need. Creators love clarity!`;
  }

  if (q.includes('budget') || q.includes('cost') || q.includes('price') || q.includes('pay')) {
    return `Budget ranges vary by scope and creator experience. Here are rough benchmarks:\n\n**Logo design** — $300–$2,500 (freelance) / $500–$5,000 (agency-level)\n**Brand identity** — $1,500–$8,000\n**Website design (UI/UX)** — $2,000–$15,000\n**Short video / animation** — $500–$5,000\n**Social media graphics (monthly)** — $300–$1,500\n\nOn Spectrum, you can post a project with a budget range and let creators propose. You're never locked in until you accept. I'd suggest leaving 10–15% buffer for revisions.`;
  }

  if (q.includes('proposal') || q.includes('evaluate') || q.includes('compare')) {
    return `When reviewing proposals, look beyond price. Here's a solid framework:\n\n1. **Portfolio relevance** — has this creator done similar work before?\n2. **Proposal quality** — did they read your brief carefully or send a generic reply?\n3. **Questions they ask** — smart questions signal experience.\n4. **Timeline realism** — overpromising fast delivery is a red flag.\n5. **Communication style** — are they clear, responsive, and professional?\n\nI'd shortlist 3–5 creators and have a brief discovery call before committing. Trust your instincts on communication fit — you'll be working closely together!`;
  }

  if (q.includes('timeline') || q.includes('deadline') || q.includes('schedule')) {
    return `For project timelines, a good rule of thumb:\n\n- **Discovery / brief alignment** — 1–3 days\n- **Initial concepts** — 3–7 days depending on complexity\n- **Revision rounds** — 2–5 days each (budget 2–3 rounds)\n- **Final delivery** — 1–2 days\n\nFor a logo project, plan for 2–4 weeks total. For a full website, 6–12 weeks. Always add a 20% buffer — life happens!\n\nWhen posting your project, I'd suggest setting the deadline a week earlier than your actual hard deadline. It gives breathing room for unexpected feedback rounds.`;
  }

  if (q.includes('milestone') || q.includes('payment') || q.includes('escrow')) {
    return `Spectrum's milestone payment system works like this:\n\n1. **You fund the milestone** — money goes into secure escrow, not directly to the creator.\n2. **Creator delivers** — they upload work and request milestone release.\n3. **You review** — you have 5 business days to approve or request revisions.\n4. **Funds release** — once you approve, payment transfers to the creator.\n\nThis protects you: if a creator disappears or the work doesn't meet spec, you can open a dispute and get your funds back. Never pay outside the platform — you lose this protection.\n\nFor large projects, I recommend breaking into 3+ milestones (kickoff, draft, final).`;
  }

  if (q.includes('feedback') || q.includes('revision') || q.includes('review')) {
    return `Good feedback gets better work. A few principles:\n\n**Be specific, not subjective.** Instead of "I don't like the colors," try "The blue feels too cold — can we try a warmer navy closer to our brand?"\n\n**Reference examples.** Share screenshots of styles you love. Saves 3 back-and-forths.\n\n**Prioritize changes.** Label feedback as must-have vs. nice-to-have so the creator knows what matters most.\n\n**Consolidate rounds.** Give all your feedback in one go rather than drip-feeding comments — it respects the creator's workflow.\n\nMost projects include 2–3 revision rounds. If you need more, a quick conversation about scope usually resolves it.`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `Hi there! I'm Miya, your AI assistant on Spectrum. I'm here to help you get the most out of your projects — from writing better briefs and evaluating proposals, to understanding payments and giving great feedback.\n\nWhat can I help you with today?`;
  }

  return `That's a great question! Here's what I'd suggest:\n\nAs a client on Spectrum, you have access to a vetted network of creative professionals. I can help you with writing project briefs, understanding pricing, evaluating creator proposals, managing timelines, navigating payments, and communicating feedback effectively.\n\nCould you tell me a bit more about what you're working on? The more context you share, the more useful I can be!`;
}

export default function ClientAiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now(), role: 'user', text: content, time: now };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // TODO: POST /ai/chat { message: content, conversation_history: messages, role: 'client' }
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));

    const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      text: getMiyaResponse(content),
      time: replyTime,
    };

    setIsTyping(false);
    setMessages(prev => [...prev, aiMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white text-lg font-bold">✦</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Miya</h1>
            <p className="text-sm text-gray-500">Your AI project assistant</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"></span>
          Online
        </span>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-sm">
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">
          {/* Welcome state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-200 mx-auto">
                <span className="text-white text-2xl">✦</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Hi, I'm Miya!</h2>
                <p className="text-gray-500 text-sm max-w-sm">I'm here to help you run better projects — from writing briefs to evaluating proposals and managing your creative team.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {suggestedPrompts.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(m => (
            <div key={m.id} className={`flex items-end gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-xs font-bold">✦</span>
                </div>
              )}
              <div className={`max-w-lg ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-cobalt text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200 shadow-sm'
                }`}>
                  {m.text.split('**').map((part, i) =>
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}
                </div>
                <p className={`text-xs text-gray-400 mt-1 ${m.role === 'user' ? 'text-right' : ''}`}>{m.time}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-end gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">✦</span>
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm border border-gray-200 shadow-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 bg-white border-t border-gray-200">
          <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 p-3 focus-within:border-violet-300 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Miya anything about your project… (Enter to send)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none resize-none placeholder-gray-400 leading-relaxed"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className={`p-2.5 rounded-xl transition-all ${
                input.trim()
                  ? 'bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:shadow-md hover:shadow-blue-200'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-paper-plane text-sm"></i>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Miya can make mistakes. Always verify important decisions independently.</p>
        </div>
      </div>
    </div>
  );
}
