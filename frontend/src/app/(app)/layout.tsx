import { AuthGuard } from "@/components/auth-guard";
import { BottomNav } from "@/components/ui";
import { PageFade } from "@/components/PageFade";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh pb-24">
        <PageFade>{children}</PageFade>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
