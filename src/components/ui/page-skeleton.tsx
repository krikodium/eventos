import { Navbar } from "@/components/layout/navbar";
import type { ComponentPropsWithoutRef } from "react";

type PageSkeletonVariant = "dashboard" | "list" | "form" | "detail";

function Bone({ className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`skeleton-bone ${className}`} aria-hidden="true" {...props} />;
}

function HeaderSkeleton() {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl space-y-4">
          <Bone className="h-3 w-24 rounded-full" />
          <Bone className="h-9 w-full max-w-md rounded-xl" />
          <Bone className="h-4 w-full max-w-xl rounded-lg" />
          <Bone className="h-4 w-3/4 max-w-lg rounded-lg" />
        </div>
        <Bone className="h-10 w-44 rounded-full" />
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Bone className="h-4 w-28 rounded-lg" />
              <Bone className="h-10 w-10 rounded-xl" />
            </div>
            <Bone className="mt-7 h-8 w-32 rounded-lg" />
            <Bone className="mt-3 h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <Bone className="h-5 w-48 rounded-lg" />
          <Bone className="mt-3 h-3 w-72 max-w-full rounded-full" />
          <div className="mt-8 flex h-64 items-end gap-4 border-b border-slate-100 px-3">
            {[38, 66, 48, 82, 58, 74].map((height, index) => (
              <Bone key={index} className="flex-1 rounded-t-xl" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <Bone className="h-5 w-36 rounded-lg" />
          <div className="mt-7 space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Bone className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3 w-4/5 rounded-full" />
                  <Bone className="h-3 w-2/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Bone className="h-5 w-48 rounded-lg" />
          <Bone className="h-3 w-64 max-w-full rounded-full" />
        </div>
        <div className="flex gap-3">
          <Bone className="h-10 w-36 rounded-xl" />
          <Bone className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-5 md:grid-cols-[auto_1.4fr_1fr_0.7fr_auto]">
            <Bone className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Bone className="h-4 w-44 max-w-full rounded-lg" />
              <Bone className="h-3 w-28 rounded-full" />
            </div>
            <Bone className="hidden h-4 w-36 rounded-lg md:block" />
            <Bone className="hidden h-7 w-24 rounded-full md:block" />
            <Bone className="h-9 w-9 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <Bone className="h-5 w-48 rounded-lg" />
        <Bone className="mt-3 h-3 w-80 max-w-full rounded-full" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={index === 0 ? "space-y-3 md:col-span-2" : "space-y-3"}>
              <Bone className="h-3 w-24 rounded-full" />
              <Bone className="h-12 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>
      <aside className="space-y-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <Bone className="h-5 w-36 rounded-lg" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Bone className="h-3 w-24 rounded-full" />
                <Bone className="h-4 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <Bone className="h-12 w-full rounded-xl" />
      </aside>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <DashboardSkeleton />
      </div>
      <aside className="space-y-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <Bone className="h-5 w-36 rounded-lg" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 4 }).map((__, row) => (
                <Bone key={row} className="h-4 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

export function PageSkeleton({ variant = "list" }: { variant?: PageSkeletonVariant }) {
  return (
    <div className="min-h-screen bg-background" role="status" aria-live="polite" aria-busy="true">
      <Navbar />
      <main className="route-skeleton mx-auto max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <span className="sr-only">Cargando contenido</span>
        <div className="space-y-6">
          <HeaderSkeleton />
          {variant === "dashboard" && <DashboardSkeleton />}
          {variant === "list" && <ListSkeleton />}
          {variant === "form" && <FormSkeleton />}
          {variant === "detail" && <DetailSkeleton />}
        </div>
      </main>
    </div>
  );
}
