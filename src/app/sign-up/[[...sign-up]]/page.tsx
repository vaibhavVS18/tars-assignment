import { SignUp } from "@clerk/nextjs";
import BubbleBackground from "@/components/BubbleBackground";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b141a] relative overflow-hidden">
      <BubbleBackground />
      <div className="relative z-10">
        <SignUp />
      </div>
    </div>
  );
}