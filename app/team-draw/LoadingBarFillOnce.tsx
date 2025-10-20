// app/loading-bar-fill-once.tsx
export default function LoadingBarFillOnce() {
  return (
    <div className="w-full max-w-md">
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.15)" }}
        role="progressbar"
        aria-label="Loading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={100}
      >
        <div className="h-full fill" />
      </div>

      <style jsx>{`
        .fill {
          width: 0%;
          background: linear-gradient(90deg, #ff8800, #ffaa33);
          animation: fill 5s cubic-bezier(.2,.6,.1,1) forwards;
          box-shadow: 0 0 12px rgba(255, 136, 0, 0.6);
        }
        @keyframes fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}