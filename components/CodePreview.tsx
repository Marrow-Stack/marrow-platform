'use client'
import { useState } from 'react'

// Minimal hand-rolled syntax highlighter — no dependencies
function highlight(code: string): string {
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    // strings
    .replace(/((['"`])(?:(?!\2)[^\\]|\\.)*\2)/g, '<em style="color:#64A98A">$1</em>')
    // comments
    .replace(/(\/\/[^\n]*)/g, '<em style="color:var(--text-3);font-style:italic">$1</em>')
    // keywords
    .replace(/\b(export|default|import|from|async|await|const|let|var|return|function|if|else|for|of|in|type|interface|extends|implements|class|new|throw|try|catch|finally|void)\b/g, '<b style="color:var(--accent)">$1</b>')
    // primitives
    .replace(/\b(true|false|null|undefined|this)\b/g, '<b style="color:#9B89D4">$1</b>')
    // numbers
    .replace(/\b(\d+)\b/g, '<span style="color:#9B89D4">$1</span>')
}

export function CodePreview({ code, filename = 'index.ts' }: { code: string; filename?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const lines = code.split('\n')

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--border)]" style={{ background: 'var(--bg-2)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <span className="w-3 h-3 rounded-full bg-red-400 opacity-60" />
        <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-60" />
        <span className="w-3 h-3 rounded-full bg-green-400 opacity-60" />
        <span className="ml-3 text-[12px] text-[var(--text-3)] font-mono">{filename}</span>
        <button onClick={copy} className="ml-auto text-[12px] px-3 py-1 rounded-lg bg-[var(--bg-3)] text-[var(--text-2)] hover:text-[var(--text)] transition-colors">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className="overflow-x-auto p-5 text-[13px] leading-[1.65]" style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>
        <code>
          {lines.map((ln, i) => (
            <div key={i} className="flex">
              <span className="select-none w-8 shrink-0 text-right pr-4 text-[var(--text-3)] opacity-40 text-[11px] pt-[1px]">{i + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: highlight(ln) || ' ' }} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  )
}
