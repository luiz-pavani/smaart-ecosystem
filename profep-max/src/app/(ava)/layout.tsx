"use client";

export default function AvaLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full min-h-screen">
      {children}
    </section>
  );
}