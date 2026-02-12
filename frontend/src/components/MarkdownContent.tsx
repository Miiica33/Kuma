'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="my-2 leading-relaxed">{children}</p>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="my-2 list-disc pl-6 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="my-2 list-decimal pl-6 space-y-0.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = className?.includes('language-')
    return isBlock ? (
      <code className="block bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm my-2">{children}</code>
    ) : (
      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">{children}</code>
    )
  },
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-muted-foreground/30 pl-4 my-2 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-primary underline hover:opacity-80" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
