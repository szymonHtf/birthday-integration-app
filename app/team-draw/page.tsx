import TeamDrawPage from "./TeamDrawPage";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen bg-black text-white pb-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full">
        <TeamDrawPage />
      </main>
    </div>
  );
}
