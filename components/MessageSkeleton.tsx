// Улучшенный скелетон с более выраженной анимацией и без затемнения при наведении
// Оставляем только две строки текста
export default function MessageSkeleton() {
  return (
    <div className="px-4 py-0.5 -mx-2">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#2f3136] animate-pulse"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2">
            <div className="h-4 w-32 bg-[#2f3136] rounded animate-pulse"></div>
            <div className="h-3 w-20 bg-[#2f3136] rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-[#2f3136] rounded animate-pulse"></div>
            <div className="h-4 w-4/5 bg-[#2f3136] rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
