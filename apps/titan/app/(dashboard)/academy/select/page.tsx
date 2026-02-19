'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Building2, ChevronRight } from 'lucide-react';

interface Academia {
  id: string;
  nome: string;
  sigla: string;
}

export default function SelectAcademy() {
  const [academies, setAcademies] = useState<Academia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchAcademies = async () => {
      try {
        // First verify user is master_access
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Não autenticado");
          return;
        }

        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1);

        if (!userRoles?.some(r => r.role === "master_access")) {
          setError("Acesso não autorizado");
          return;
        }

        // Fetch all academies
        const { data: academyList, error: fetchError } = await supabase
          .from("academias")
          .select("id, nome, sigla")
          .order("nome");

        if (fetchError) throw fetchError;
        setAcademies(academyList || []);
      } catch (err: any) {
        console.error("Erro ao buscar academias:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademies();
  }, []);

  const handleSelect = (academyId: string) => {
    if (selectedId === academyId) {
      // Navigate to dashboard with academy selected
      router.push(`/academy/dashboard?academyId=${academyId}`);
    } else {
      setSelectedId(academyId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto bg-red-50 text-red-700 rounded-lg p-6">
          Erro: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Selecione uma Academia</h1>
          <p className="text-gray-600">Escolha a academia que deseja gerenciar</p>
        </div>

        {/* Academy List */}
        <div className="grid gap-4">
          {academies.map((academy) => (
            <button
              key={academy.id}
              onClick={() => handleSelect(academy.id)}
              className={`group relative overflow-hidden rounded-lg border-2 p-6 transition-all duration-300 ${
                selectedId === academy.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:border-primary/30 hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${
                    selectedId === academy.id
                      ? "bg-primary/10"
                      : "bg-gray-100 group-hover:bg-primary/5"
                  }`}>
                    <Building2 className={`h-6 w-6 ${
                      selectedId === academy.id
                        ? "text-primary"
                        : "text-gray-600 group-hover:text-primary"
                    }`} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">{academy.nome}</h3>
                    <p className="text-sm text-gray-600">Sigla: {academy.sigla}</p>
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 transition-all ${
                  selectedId === academy.id
                    ? "text-primary translate-x-1"
                    : "text-gray-400 group-hover:translate-x-0"
                }`} />
              </div>

              {selectedId === academy.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/academy/dashboard?academyId=${academy.id}`);
                    }}
                  >
                    Acessar Academia
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>

        {academies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma academia encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
