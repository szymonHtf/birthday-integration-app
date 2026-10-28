import type { QuestionAnswer } from "../lib/api";

/** True when at least one of the 4 options is a photo – then all options render as a photo grid. */
export function hasPhotoAnswers(answers: QuestionAnswer[]): boolean {
  return answers.some((a) => !!a.image);
}

/** Label used for the answer_text we store and for accessibility. */
export function answerLabel(answer: QuestionAnswer, index: number): string {
  return answer.text ?? (answer.image ? `zdjęcie ${index + 1}` : `odpowiedź ${index + 1}`);
}

/** Inner content of an answer option: text, a photo, or a photo with a caption. */
export function AnswerContent({ answer, index, photoGrid }: { answer: QuestionAnswer; index: number; photoGrid: boolean }) {
  if (!photoGrid) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-xs">
          {index + 1}
        </span>
        <span>{answer.text ?? "—"}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-900">
        {answer.image ? (
          // Guests' photos come straight from public/ or an external URL – no Next image pipeline needed.
          <img src={answer.image} alt={answer.text ?? `odpowiedź ${index + 1}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-sm text-zinc-300">
            {answer.text ?? "—"}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-600 bg-black/70 text-xs">
          {index + 1}
        </span>
      </div>
      {answer.image && answer.text && <span className="mt-1 truncate text-center text-sm">{answer.text}</span>}
    </div>
  );
}

/** Photo attached to the question itself (optional). */
export function QuestionPhoto({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (!src) return null;
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-red-800/40 bg-zinc-900">
      <img src={src} alt={alt} className="mx-auto max-h-[40vh] w-full object-contain" />
    </div>
  );
}
