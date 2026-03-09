import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { UtilerosPorEvento } from "@/components/utileros/utileros-por-evento";

export default async function UtilerosPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-6">
          Utileros por evento
        </h1>
        <p className="text-gray-600 text-sm mb-8">
          Carga días de armado, guardia, evento, desarme en evento y desarme en depósito para cada utilero.
        </p>
        <UtilerosPorEvento />
      </main>
    </div>
  );
}
