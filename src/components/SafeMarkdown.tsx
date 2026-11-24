import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-[#7C3AED] dark:text-[#38BDF8]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, rawUrl] = linkMatch;
      const safe = /^https?:\/\//i.test(rawUrl);
      if (safe) {
        return (
          <a
            key={idx}
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#8B5CF6]/50 underline-offset-2 text-[#6366F1] dark:text-[#38BDF8] hover:opacity-80"
          >
            {label}
          </a>
        );
      }
      return <span key={idx}>{label}</span>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-[#0A0A10] text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-zinc-400">
        <span className="font-mono">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-zinc-300 hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const lines = segment.slice(3, -3).split('\n');
          const language = (lines[0] ?? '').trim();
          const code = lines.slice(1).join('\n').trimEnd();
          return <CodeBlock key={segIdx} language={language} code={code} />;
        }

        const lines = segment.split('\n');
        return (
          <div key={segIdx} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;
              if (trimmed.startsWith('### ')) {
                return (
                  <h4
                    key={lineIdx}
                    className="pt-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {renderInlineFormatting(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3
                    key={lineIdx}
                    className="pt-1 text-base font-semibold text-slate-900 dark:text-slate-50"
                  >
                    {renderInlineFormatting(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#8B5CF6]" aria-hidden="true" />
                    <span>{renderInlineFormatting(trimmed.slice(2))}</span>
                  </div>
                );
              }
              if (/^\d+\.\s/.test(trimmed)) {
                const match = trimmed.match(/^(\d+\.)\s(.*)$/);
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="font-mono text-xs font-semibold text-[#8B5CF6] mt-0.5 shrink-0">
                      {match?.[1]}
                    </span>
                    <span>{renderInlineFormatting(match?.[2] ?? trimmed)}</span>
                  </div>
                );
              }
              return <p key={lineIdx}>{renderInlineFormatting(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};
