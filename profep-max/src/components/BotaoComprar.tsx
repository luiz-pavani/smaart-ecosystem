"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, QrCode, AlertTriangle } from "lucide-react";

export default function BotaoComprar({ planoId }: { planoId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCompra = async () => {
    // 1. Plano gratuito não precisa de gateway
    if (planoId === "price_branca") {
      router.push("/login?returnTo=/dashboard");
      return;
    }

    setLoading(true);
    
    // 2. Verifica se o usuário está logado
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?returnTo=/checkout`);
      return;
    }

    try {
      // 3. Chama o checkout via API Route
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planoId,
          email: user.email,
          name: user.user_metadata?.full_name || "Cliente",
          cpf: "00000000000",
          phone: "11999999999",
          paymentMethod: "6"
        })
      });

      const checkoutData = await response.json();

      if (checkoutData && checkoutData.ResponseDetail?.UrlCheckout) {
        // Redireciona para o checkout seguro do Safe2Pay
        window.location.href = checkoutData.ResponseDetail.UrlCheckout;
      } else {
        alert("Não foi possível gerar o pagamento. Verifique se o Token está correto ou se o CPF/Email são válidos.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro na conexão com o gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCompra}
      disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/20 group"
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          <CreditCard size={20} className="group-hover:scale-110 transition-transform" />
          {planoId === "price_vitalicio" ? "Comprar Acesso Vitalício" : "Assinar Plano VIP"}
        </>
      )}
    </button>
  );
}