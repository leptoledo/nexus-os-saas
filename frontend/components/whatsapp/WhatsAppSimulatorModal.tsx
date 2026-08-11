'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { DEFAULT_MESSAGES } from '@/hooks/useWhatsApp'

interface WhatsAppSimulatorModalProps {
  open: boolean
  onClose: () => void
  onSelectConversation?: (convId: string) => void
}

interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: string
}

const QUICK_PROMPTS = [
  'Olá! Quais os preços dos planos da agência?',
  'Como funciona a gestão de tráfego pago?',
  'Quero agendar uma demonstração.',
  'Quais as redes sociais atendidas?',
]

const SIMULATOR_CONV_ID = 'v1000000-0000-0000-0000-000000000099'

export function WhatsAppSimulatorModal({ open, onClose, onSelectConversation }: WhatsAppSimulatorModalProps) {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: '👋 Olá! Sou o assistente virtual inteligente da agência (NexusOS Bot). Como posso ajudar o seu negócio hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  function syncToLiveConversations(userText: string, botText: string) {
    const nowIso = new Date().toISOString()
    const userMsg = {
      id: `sim-user-${Date.now()}`,
      direction: 'inbound' as const,
      content: userText,
      sent_at: nowIso,
      sender_name: 'Cliente (Simulador)',
    }
    const botMsg = {
      id: `sim-bot-${Date.now() + 1}`,
      direction: 'outbound' as const,
      content: botText,
      sent_at: nowIso,
      sender_name: 'NexusOS Bot',
    }

    if (!DEFAULT_MESSAGES[SIMULATOR_CONV_ID]) {
      DEFAULT_MESSAGES[SIMULATOR_CONV_ID] = []
    }
    DEFAULT_MESSAGES[SIMULATOR_CONV_ID].push(userMsg, botMsg)

    // Update query cache for simulator conversation messages
    queryClient.setQueryData(['whatsapp', 'conversations', SIMULATOR_CONV_ID, 'messages'], (old: any[] = []) => [
      ...old,
      userMsg,
      botMsg,
    ])

    // Update conversation list item
    queryClient.setQueryData(['whatsapp', 'conversations', undefined], (old: any[] = []) => {
      const existingIdx = old.findIndex((c) => c.id === SIMULATOR_CONV_ID)
      const simConvItem = {
        id: SIMULATOR_CONV_ID,
        contact_name: 'Cliente (Simulador Bot)',
        contact_phone: '+351 910 000 999',
        last_message: botText,
        last_message_at: nowIso,
        status: 'active' as const,
        unread_count: 0,
        assigned_to: 'NexusOS Bot',
      }

      if (existingIdx >= 0) {
        const updated = [...old]
        updated[existingIdx] = simConvItem
        return updated
      }
      return [simConvItem, ...old]
    })

    if (onSelectConversation) {
      onSelectConversation(SIMULATOR_CONV_ID)
    }
  }

  function handleSend(textToSend?: string) {
    const text = textToSend || input
    if (!text.trim()) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsTyping(true)

    // Simulate AI WhatsApp bot response
    setTimeout(() => {
      let botResponse = 'Obrigado pelo seu contacto! Um dos nossos consultores irá analisar o seu pedido em breve.'
      const lower = text.toLowerCase()

      if (lower.includes('preço') || lower.includes('plano') || lower.includes('quanto custa')) {
        botResponse = '💰 Nossos planos começam a partir de 49€/mês no plano Starter, 149€/mês no plano Pro e 399€/mês no plano Business. Gostaria de agendar uma reunião comercial para alinharmos a melhor opção para a sua agência?'
      } else if (lower.includes('tráfego') || lower.includes('ads') || lower.includes('campanha')) {
        botResponse = '🚀 Realizamos a gestão completa de campanhas no Meta Ads (Instagram/Facebook) e Google Ads com relatórios automatizados de ROI e conversões no NexusOS Analytics!'
      } else if (lower.includes('agendar') || lower.includes('demonstração') || lower.includes('reunião')) {
        botResponse = '📅 Excelente! Pode escolher o melhor horário para uma chamada de 15 minutos com o nosso especialista pelo link: https://nexusos.io/demo'
      } else if (lower.includes('redes') || lower.includes('social') || lower.includes('instagram')) {
        botResponse = '📱 Gerimos conteúdos para Instagram, LinkedIn, Facebook e TikTok, incluindo calendário editorial visual e agendamento automático.'
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
      syncToLiveConversations(text.trim(), botResponse)
    }, 1000)
  }

  function handleReset() {
    setMessages([
      {
        id: 'm1',
        sender: 'bot',
        text: '👋 Olá! Sou o assistente virtual inteligente da agência (NexusOS Bot). Como posso ajudar o seu negócio hoje?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#0f1422] text-white shadow-2xl">
        {/* Header no estilo WhatsApp / Bot */}
        <div className="bg-[#090d16] border-b border-emerald-500/20 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center border border-emerald-500/40">
                <Bot className="w-5 h-5 text-[#00e699]" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00e699] border-2 border-[#090d16] rounded-full"></span>
            </div>
            <div>
              <DialogTitle className="text-white text-base font-bold flex items-center gap-1.5">
                Simulador Bot WhatsApp
                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded text-[#00e699] border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" /> GPT-4o
                </span>
              </DialogTitle>
              <p className="text-xs text-slate-400">Atendimento Automatizado • Online</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
          </Button>
        </div>

        {/* Chat Body */}
        <div className="bg-[#090d16] p-4 h-[360px] overflow-y-auto space-y-3" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[82%] text-sm rounded-xl p-3 shadow-md',
                msg.sender === 'user'
                  ? 'ml-auto bg-[#00e699] text-slate-950 font-medium rounded-br-none'
                  : 'mr-auto bg-[#0f1422] text-slate-100 border border-slate-800 rounded-bl-none'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-75 font-semibold">
                {msg.sender === 'bot' ? (
                  <>
                    <Bot className="w-3 h-3 text-[#00e699]" /> NexusOS AI
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 text-slate-900" /> Cliente
                  </>
                )}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              <span className="text-[10px] opacity-60 self-end mt-1">{msg.timestamp}</span>
            </div>
          ))}

          {isTyping && (
            <div className="mr-auto bg-[#0f1422] text-slate-300 border border-slate-800 rounded-xl rounded-bl-none p-3 text-xs flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#00e699] animate-pulse" />
              <span>O robô está a escrever...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-[#090d16] border-t border-slate-800/80 p-2 overflow-x-auto flex gap-1.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isTyping}
              className="text-xs bg-[#0f1422] hover:bg-slate-800 text-slate-300 border border-slate-700/60 rounded-full px-3 py-1 whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="bg-[#090d16] border-t border-slate-800 p-3 flex gap-2"
        >
          <Input
            placeholder="Digite uma mensagem para simular..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            className="bg-[#0f1422] border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-[#00e699]"
          />
          <Button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="bg-[#00e699] hover:bg-[#05df8a] text-slate-950 font-bold shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
