import { cn } from '../ui';

interface QuestionNavProps {
  total: number;
  currentIndex: number;
  answers: string[];
  marked: boolean[];
  onJump: (index: number) => void;
}

export default function QuestionNav({ total, currentIndex, answers, marked, onJump }: QuestionNavProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-1 py-2 min-w-max justify-center">
        {Array.from({ length: total }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = answers[i]?.trim().length > 0;
          const isMarked = marked[i];

          let dotClass = 'bg-gray-200 text-gray-500 border-gray-200'; // 未答
          if (isMarked) {
            dotClass = 'bg-orange-100 text-orange-600 border-orange-400'; // 标记
          } else if (isAnswered) {
            dotClass = 'bg-blue-100 text-blue-600 border-blue-400'; // 已答
          }

          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={cn(
                'flex-shrink-0 w-9 h-9 rounded-full text-sm font-bold border-2 flex items-center justify-center transition-all',
                dotClass,
                isCurrent && 'ring-2 ring-offset-2 ring-primary scale-110',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
