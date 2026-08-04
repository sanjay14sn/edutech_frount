"use client"

import * as React from "react"
import { X, Send, Mail, Bot, User, ChevronDown, Sparkles } from "lucide-react"
import { api } from "@/lib/api"

type ChatMessage = {
  id: string
  side: "left" | "right"
  role: string
  label: string
  subject?: string
  body: string
  at?: string | Date | null
}

type ChatPayload = {
  leadId: string
  name: string
  email: string
  course: string
  stage: string
  emailStatus: string
  outreachSentAt?: string | null
  repliedAt?: string | null
  intentScore?: number
  lastIntent?: string
  messages: ChatMessage[]
  replyCount: number
}

function formatTime(d?: string | Date | null) {
  if (!d) return ""
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Bubble({
  side,
  label,
  role,
  subject,
  body,
  at,
}: ChatMessage) {
  const isRight = side === "right"
  const isAi = role === "ai" || role === "outreach"
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"} gap-2`}>
      {!isRight && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-violet-500">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isRight ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <span className="text-[10px] text-muted-foreground px-1">{label}</span>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isRight
              ? isAi
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : "bg-teal-600 text-white rounded-tr-sm"
              : "bg-muted border border-border text-foreground rounded-tl-sm"
          }`}
        >
          {subject ? (
            <p className={`text-[11px] font-semibold mb-1 ${isRight ? "text-white/70" : "text-muted-foreground"}`}>
              {subject}
            </p>
          ) : null}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{body}</p>
        </div>
        {at ? <span className="text-[10px] text-muted-foreground px-1">{formatTime(at)}</span> : null}
      </div>
      {isRight && (
        <div
          className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
            isAi ? "bg-indigo-500" : "bg-teal-500"
          }`}
        >
          {isAi ? <Bot className="w-3.5 h-3.5 text-white" /> : <Mail className="w-3.5 h-3.5 text-white" />}
        </div>
      )}
    </div>
  )
}

export default function LeadChatDrawer({
  leadId,
  leadName,
  onClose,
  onUpdated,
}: {
  leadId: string
  leadName?: string
  onClose: () => void
  onUpdated?: () => void
}) {
  const [chat, setChat] = React.useState<ChatPayload | null>(null)
  const [body, setBody] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [showSubject, setShowSubject] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [outreachLoading, setOutreachLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const textRef = React.useRef<HTMLTextAreaElement>(null)

  const refresh = React.useCallback(async () => {
    try {
      const data = await api.getLeadChat(leadId)
      setChat(data)
    } catch {
      /* ignore poll errors */
    } finally {
      setLoading(false)
    }
  }, [leadId])

  React.useEffect(() => {
    void refresh()
    const interval = setInterval(() => void refresh(), 5000)
    return () => clearInterval(interval)
  }, [refresh])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages])

  React.useEffect(() => {
    textRef.current?.focus()
  }, [])

  const defaultSubject = chat?.messages?.length
    ? `Re: your ${chat.course} enquiry`
    : `Regarding your ${chat?.course || "course"} enquiry`

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError("")
    try {
      const res = await api.sendLeadChatReply(leadId, {
        subject: subject.trim() || defaultSubject,
        body: body.trim(),
      })
      setBody("")
      setSubject("")
      if (res.chat) setChat(res.chat)
      onUpdated?.()
    } catch (err: any) {
      setError(err?.message || "Failed to send reply")
    } finally {
      setSending(false)
    }
  }

  async function handleOutreach() {
    setOutreachLoading(true)
    setError("")
    try {
      const res = await api.triggerLeadOutreach(leadId)
      if (res.chat) setChat(res.chat)
      onUpdated?.()
    } catch (err: any) {
      setError(err?.message || "Failed to send outreach")
    } finally {
      setOutreachLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-card shadow-2xl z-50 flex flex-col border-l border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
                {chat?.name || leadName || "Lead"}
              </p>
              <p className="text-xs text-teal-600 truncate">{chat?.email || "Loading…"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void handleOutreach()}
              disabled={outreachLoading}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50"
              title="Send / resend AI outreach"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {outreachLoading ? "Sending…" : "Outreach"}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {chat && (
          <div className="px-5 py-2 border-b border-border flex flex-wrap gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
              {chat.emailStatus || "none"}
            </span>
            {chat.outreachSentAt && (
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300">
                Outreach sent
              </span>
            )}
            {chat.repliedAt && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Replied
              </span>
            )}
            {chat.lastIntent ? (
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                {chat.lastIntent} · {chat.intentScore || 0}
              </span>
            ) : null}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-muted/30">
          {loading && !chat ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Loading conversation…
            </div>
          ) : !chat?.messages?.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Mail className="w-10 h-10 opacity-30" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send outreach to start the AI email chatbot.</p>
            </div>
          ) : (
            chat.messages.map((m) => <Bubble key={m.id} {...m} />)
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border bg-card px-4 py-3 space-y-2">
          {error ? (
            <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-1.5">{error}</p>
          ) : null}

          <button
            onClick={() => setShowSubject((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSubject ? "rotate-180" : ""}`} />
            {showSubject ? "Hide subject" : "Edit subject"}
          </button>

          {showSubject && (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={defaultSubject}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={textRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Type your reply… (⌘+Enter to send)"
              className="flex-1 text-sm border border-border rounded-xl px-3 py-2.5 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!body.trim() || sending}
              className="p-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Replying to {chat?.email || "—"} · AI also auto-replies to inbound email
          </p>
        </div>
      </aside>
    </>
  )
}
