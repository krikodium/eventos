import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { UtilerosPorEvento } from "@/components/utileros/utileros-por-evento";

export default async function UtilerosPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
          Utileros por evento
        </h1>
        <p className="text-slate-600 text-sm mb-8">
          Carga días de armado, guardia, evento, desarme en evento y desarme en depósito para cada utilero.
        </p>
        <UtilerosPorEvento />
      </main>
    </div>
  );
}
