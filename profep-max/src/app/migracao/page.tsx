"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { CheckCircle2, Loader2, Gift, ShieldCheck, CreditCard } from "lucide-react";

// --- CONTEÚDO PRINCIPAL DA PÁGINA ---
function ConteudoMigracao() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email");

  const [etapa, setEtapa] = useState<'busca' | 'confirmacao' | 'pagamento'>('busca');
  const [loading, setLoading] = useState(false);
  const [aluno, setAluno] = useState<any>({});
  const [senha, setSenha] = useState("");

  // 1. Localiza o aluno pré-cadastrado
  async function buscarAluno(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    
    // Prioriza o email digitado, se não, tenta o da URL
    const targetEmail = aluno?.email || emailParam;
    
    if (!targetEmail) {
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', targetEmail.toLowerCase().trim())
      .single();

    if (data && data.migracao_pendente) {
      setAluno(data);
      setEtapa('confirmacao');
    } else if (data && !data.migracao_pendente) {
        alert("Sua conta já foi migrada. Faça login normalmente.");
        router.push('/auth');
    } else {
      alert("Cadastro não encontrado para migração. Entre em contato com o suporte.");
    }
    setLoading(false);
  }

  // Auto-busca se vier com email na URL
  useEffect(() => { 
      if (emailParam) {
          // Preenche o estado inicial para evitar erro no primeiro render
          setAluno({ email: emailParam });
          buscarAluno(); 
      }
  }, [emailParam]);

  // 2. Cria a senha e ativa a conta
  async function confirmarCadastro() {
    setLoading(true);
    
    // Tenta atualizar a senha (se o user já existir no Auth mas nunca logou) ou criar novo
    // Para simplificar a migração, usamos signUp. Se já existir, ele retorna erro, aí tentamos update.
    const { error: authError } = await supabase.auth.signUp({
      email: aluno.email,
      password: senha,
    });

    // Se o usuário já existe no Auth (ex: convidado anteriormente), apenas atualizamos a senha
    if (authError && authError.message.includes("already registered")) {
        const { error: updateError } = await supabase.auth.updateUser({ password: senha });
        if (updateError) {
            alert("Erro ao definir senha. Tente recuperar senha.");
            setLoading(false);
            return;
        }
    } else if (authError) {
        alert(authError.message);
        setLoading(false);
        return;
    }

    // Atualiza o perfil para deixar de ser pendente e vincula o ID se necessário
    await supabase.from('profiles').update({ 
        migracao_pendente: false,
        data_migracao: new Date().toISOString()
    }).eq('email', aluno.email); // Usa email como chave segura aqui
      
    setEtapa('pagamento');
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full">
        
        {/* LOGO / HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            PROFEP<span className="text-red-600">MAX</span>
          </h1>
          <div className="inline-block bg-red-600/10 border border-red-600/20 px-4 py-1 rounded-full mt-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Programa de Migração Oficial</span>
          </div>
        </div>

        {/* ETAPA 1: BUSCA POR EMAIL (Caso não venha no link) */}
        {etapa === 'busca' && (
          <form onSubmit={buscarAluno} className="space-y-4 animate-in fade-in duration-500">
            <p className="text-zinc-500 text-sm text-center mb-6">Insira seu e-mail cadastrado na plataforma anterior para resgatar seus benefícios.</p>
            <input 
              required
              type="email"
              placeholder="SEU E-MAIL"
              defaultValue={emailParam || ''}
              className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600 transition-all"
              onChange={(e) => setAluno({...aluno, email: e.target.value})}
            />
            <button disabled={loading} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all">
              {loading ? <Loader2 className="animate-spin"/> : "Verificar Benefícios"}
            </button>
          </form>
        )}

        {/* ETAPA 2: CONFIRMAÇÃO E SENHA */}
        {etapa === 'confirmacao' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[32px] text-center">
              <Gift className="text-red-500 mx-auto mb-4" size={32} />
              <h2 className="text-xl font-black uppercase italic">Olá, {aluno.full_name?.split(' ')[0]}!</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Você ganhou 30 dias de acesso total</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Crie sua nova senha de acesso</label>
              <input 
                type="password"
                placeholder="NOVA SENHA"
                className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-white font-bold outline-none focus:border-red-600 transition-all"
                onChange={(e) => setSenha(e.target.value)}
              />
              <button onClick={confirmarCadastro} disabled={loading || senha.length < 6} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all">
                {loading ? <Loader2 className="animate-spin"/> : "Ativar Meus 30 Dias"}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: PAGAMENTO E CONDIÇÃO ESPECIAL */}
        {etapa === 'pagamento' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500 text-center">
             <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-500" size={40} />
             </div>
             <h2 className="text-2xl font-black uppercase italic">Conta Ativada!</h2>
             <p className="text-zinc-500 text-sm leading-relaxed">
               Seu período gratuito começou. Para garantir sua vaga no ProfepMax após os 30 dias, escolha sua forma de pagamento.
             </p>

             {aluno.cond === 'ATIVO' && (
               <div className="bg-red-600 p-6 rounded-[32px] text-left relative overflow-hidden">
                  <ShieldCheck className="absolute -right-4 -bottom-4 text-black/10" size={100} />
                  <span className="text-[9px] font-black bg-black text-white px-3 py-1 rounded-full uppercase">Condição de Migração</span>
                  <p className="text-sm font-black text-white mt-4 leading-tight italic uppercase">Apenas R$ 35,00/mês</p>
                  <p className="text-[10px] text-red-200 font-bold uppercase">Garantido pelos primeiros 6 meses</p>
               </div>
             )}

             <button onClick={() => router.push('/checkout-migracao')} className="w-full border border-zinc-800 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all">
                Configurar Pagamento <CreditCard size={18}/>
             </button>
             
             <button onClick={() => router.push('/dashboard')} className="text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                Ir para o Dashboard primeiro
             </button>
          </div>
        )}

      </div>
    </div>
  );
}

// --- EXPORTAÇÃO COM SUSPENSE PARA EVITAR ERRO DE BUILD ---
export default function PaginaMigracao() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="text-red-600 animate-spin" size={32}/>
        </div>
    }>
        <ConteudoMigracao />
    </Suspense>
  );
}