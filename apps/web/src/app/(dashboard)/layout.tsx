import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = { title: "Dashboard — Qurl" };

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 pb-20 sm:p-6 sm:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
