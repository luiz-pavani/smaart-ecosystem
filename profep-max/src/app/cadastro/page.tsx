"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/ava/dashboard");
    });
    const fromCheckout = searchParams.get("from") === "checkout";
    if (fromCheckout && typeof window !== "undefined" && window.localStorage) {
      const lastEmail = window.localStorage.getItem("lastCheckoutEmail");
      if (lastEmail) setEmail(lastEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    if (!email || !name || !password) {
      setError("Preencha todos os campos obrigatórios.");
      setLoading(false);
      return;
    }
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName: name }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Erro ao cadastrar.");
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace("/ava/dashboard");
      return;
    }
    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Complete seu cadastro</h1>
      <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
        <input
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700 text-white"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700 text-white"
          type="text"
          placeholder="Nome completo"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="w-full p-3 rounded bg-zinc-900 border border-zinc-700 text-white"
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-500 text-sm">Cadastro realizado! Redirecionando...</div>}
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Finalizar cadastro"}
        </button>
      </form>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroContent />
    </Suspense>
  );
}
