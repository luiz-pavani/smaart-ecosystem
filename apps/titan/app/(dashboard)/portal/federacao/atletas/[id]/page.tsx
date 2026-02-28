"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AtletaEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [atleta, setAtleta] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_fed_lrsj")
        .select("*")
        .eq("id", params.id)
        .single();
      setAtleta(data);
      setForm(data);
      setLoading(false);
    };
    load();
  }, [params.id]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    await supabase
      .from("user_fed_lrsj")
      .update(form)
      .eq("id", params.id);
    setLoading(false);
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!atleta) {
    return <div className="text-center text-white">Atleta não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>
      <h1 className="text-3xl font-bold text-white mb-8">Editar Atleta</h1>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto bg-white/5 p-8 rounded-xl backdrop-blur">
        {Object.entries(form).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <label className="text-gray-400 mb-2 font-medium">{key}</label>
            <input
              name={key}
              value={value ?? ""}
              onChange={handleChange}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        ))}
      </form>
      <button
        onClick={handleSave}
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
      >
        Salvar
      </button>
    </div>
  );
}
