"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { ArrowUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

const DEFAULT_PLACEHOLDERS = [
  "Quantas NCs tem abertas no hospital?",
  "Qual sala cirúrgica tem maior risco de atraso?",
  "Qual equipamento tem mais falhas recorrentes?",
  "Qual inspetor realizou mais rondas?",
  "Quais NCs críticas exigem validação hoje?",
  "Qual o status de prontidão das salas?",
]

interface AIChatInputProps {
  value?: string
  onChange?: (value: string) => void
  onSend?: (value: string) => void
  disabled?: boolean
  placeholders?: string[]
  className?: string
}

export function AIChatInput({
  value: controlledValue,
  onChange: controlledOnChange,
  onSend,
  disabled = false,
  placeholders = DEFAULT_PLACEHOLDERS,
  className = "",
}: AIChatInputProps) {
  const [internalValue, setInternalValue] = useState("")
  const isControlled = controlledValue !== undefined
  const inputValue = isControlled ? controlledValue : internalValue

  const handleInputChange = (val: string) => {
    if (!isControlled) {
      setInternalValue(val)
    }
    controlledOnChange?.(val)
  }

  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [showPlaceholder, setShowPlaceholder] = useState(true)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cycle placeholder text when input is inactive
  useEffect(() => {
    if (isFocused || inputValue) return

    const interval = setInterval(() => {
      setShowPlaceholder(false)
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
        setShowPlaceholder(true)
      }, 350)
    }, 3200)

    return () => clearInterval(interval)
  }, [isFocused, inputValue, placeholders])

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return
    const toSend = inputValue.trim()
    onSend?.(toSend)
    if (!isControlled) {
      setInternalValue("")
    } else {
      controlledOnChange?.("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const placeholderContainerVariants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.018 } },
    exit: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
  }

  const letterVariants = {
    initial: {
      opacity: 0,
      filter: "blur(6px)",
      y: 6,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        opacity: { duration: 0.18 },
        filter: { duration: 0.28 },
        y: { type: "spring" as const, stiffness: 100, damping: 20 },
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(6px)",
      y: -6,
      transition: {
        opacity: { duration: 0.12 },
        filter: { duration: 0.2 },
        y: { type: "spring" as const, stiffness: 100, damping: 20 },
      },
    },
  }

  const hasText = inputValue.trim().length > 0

  return (
    <div className={`w-full flex justify-center items-center text-slate-900 ${className}`}>
      <div
        className={`w-full rounded-full bg-white border transition-all duration-200 flex items-center p-1.5 pl-4 pr-1.5 shadow-sm ${
          isFocused
            ? "border-slate-300 ring-2 ring-slate-100/80 shadow-md"
            : "border-slate-200/90"
        }`}
      >
        {/* Text Input & Animated Placeholder */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            className="border-0 outline-0 py-1.5 text-[13.5px] bg-transparent w-full font-normal text-slate-900 placeholder:text-transparent"
            style={{ position: "relative", zIndex: 1 }}
          />
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center">
            <AnimatePresence mode="wait">
              {showPlaceholder && !isFocused && !inputValue && (
                <motion.span
                  key={placeholderIndex}
                  className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] select-none pointer-events-none font-normal"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "calc(100% - 10px)",
                    zIndex: 0,
                  }}
                  variants={placeholderContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {placeholders[placeholderIndex]
                    .split("")
                    .map((char, i) => (
                      <motion.span
                        key={i}
                        variants={letterVariants}
                        style={{ display: "inline-block" }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </motion.span>
                    ))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Modern Round Send Button with ArrowUp (ChatGPT / Apple Style) */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || disabled}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shrink-0 ml-1.5 shadow-xs ${
            hasText && !disabled
              ? "bg-slate-900 text-white hover:bg-black scale-100 opacity-100"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-not-allowed opacity-60"
          }`}
          title="Enviar"
        >
          <ArrowUp size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  )
}
