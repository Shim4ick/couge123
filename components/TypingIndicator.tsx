import { motion } from "framer-motion"

interface TypingIndicatorProps {
  typingUsers: string[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const message =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : `${typingUsers[0]} and more ${typingUsers.length - 1} is typing`

  return (
    <div className="flex items-center space-x-2 text-xs text-gray-400 bg-[#2f3136] rounded-md px-2 py-1 mb-1 shadow-sm">
      <span className="font-medium">{message}</span>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 bg-gray-400 rounded-full"
            animate={{
              y: ["0%", "-50%", "0%"],
            }}
            transition={{
              duration: 0.6,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  )
}
