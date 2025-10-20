import Image from "next/image";
import TeamDraw from "./TeamDraw";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <Image
          src="/pumpkin-logo.svg"
          alt="Next.js logo"
          width={280}
          height={38}
          priority
        />
        <ol className="font-mono list-inside text-lg text-center">
          <li className="mb-2">
            Wybór drużyn!
          </li>
          <TeamDraw />
        </ol>
      </main>
    </div>
  );
}
