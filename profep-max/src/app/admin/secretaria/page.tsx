"use client";



import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { 
  Users, Search, Loader2, X, BadgeDollarSign, 
  ChevronRight, RefreshCw, KeyRound, CheckCircle2, Save, Award, ClipboardCheck, UserPlus, Mail
} from "lucide-react";


export default function SecretariaPage() {
    // Função para ordenar colunas (deve estar fora do JSX)
    function handleSort(col: string) {
      if (sortCol === col) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortCol(col);
        setSortDir('asc');
      }
    }
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [alunosComCupom, setAlunosComCupom] = useState<any[]>([]);
  const [sortCol, setSortCol] = useState<string>('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filtro, setFiltro] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [vendasAluno, setVendasAluno] = useState<any[]>([]);
  const [resultadosExames, setResultadosExames] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [mostrarNovoAluno, setMostrarNovoAluno] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [novoAluno, setNovoAluno] = useState({
    full_name: "",
    email: "",
    cpf: "",
    phone: "",
    valor_mensal: "49.90",
    plan: "mensal"
  });

  async function handleDeleteUser() {
    if (!alunoSelecionado) return;
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação é irreversível.')) return;
    setSalvando(true);
    try {
      const response = await fetch('/api/admin/secretaria/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: alunoSelecionado.email, id: alunoSelecionado.id })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Usuário deletado com sucesso!');
        setAlunoSelecionado(null);
        fetchAlunos();
      } else {
        alert('Erro ao deletar: ' + (data.error || 'Erro desconhecido.'));
      }
    } catch (error) {
      alert('Erro ao deletar usuário.');
    }
    setSalvando(false);
  }

  useEffect(() => { 
    fetchAlunos(); 
  }, []);

  async function fetchAlunos() {
    setLoading(true);
    const { data: perfis } = await supabase.from('profiles').select('*').order('full_name');
    if (!perfis) { setLoading(false); return; }
    // Buscar vendas para todos os alunos
    const emails = perfis.map((a: any) => a.email);
    const { data: vendas } = await supabase.from('vendas').select('email, cupom, plano, created_at').in('email', emails);
    // Mapear cupom/plano mais recente para cada aluno
    const vendasPorEmail: Record<string, any> = {};
    (vendas || []).forEach(v => {
      if (!vendasPorEmail[v.email] || new Date(v.created_at) > new Date(vendasPorEmail[v.email].created_at)) {
        vendasPorEmail[v.email] = v;
      }
    });
    const alunosCupom = perfis.map((a: any) => ({
      ...a,
      plano_venda: vendasPorEmail[a.email]?.plano || a.plan || '',
      cupom: vendasPorEmail[a.email]?.cupom || '',
    }));
    setAlunos(perfis);
    setAlunosComCupom(alunosCupom);
    setLoading(false);
  }

  async function abrirDetalhes(aluno: any) {
    setAlunoSelecionado({ ...aluno }); 
    setResetStatus(null);
    
    // Busca Vendas e os Resultados dos Exames Inteligentes
    const [vendasRes, examesRes] = await Promise.all([
      supabase.from('vendas').select('*').eq('email', aluno.email),
      supabase.from('resultados_exames').select('*, cursos(titulo)').eq('user_id', aluno.id).order('created_at', { ascending: false })
    ]);

    setVendasAluno(vendasRes.data || []);
    setResultadosExames(examesRes.data || []);
  }

  async function handleSalvarDados() {
    setSalvando(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: alunoSelecionado.full_name,
        phone: alunoSelecionado.phone,
        instagram: alunoSelecionado.instagram,
        plan: alunoSelecionado.plan,
        cpf: alunoSelecionado.cpf,
        email: alunoSelecionado.email
      })
      .eq('id', alunoSelecionado.id);

    if (!error) {
      alert("Dossiê atualizado com sucesso!");
      fetchAlunos();
    } else {
      alert("Erro ao atualizar: " + error.message);
    }
    setSalvando(false);
  }

  async function handleAlterarSenha() {
    if (!novaSenha || novaSenha.length < 6) {
      alert("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: alunoSelecionado.id,
          newPassword: novaSenha
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert("Senha alterada com sucesso!");
        setNovaSenha("");
      } else {
        alert("Erro ao alterar senha: " + data.error);
      }
    } catch (error) {
      alert("Erro ao alterar senha");
    }
    setSalvando(false);
  }

  async function handleCriarNovoAluno() {
    if (!novoAluno.full_name || !novoAluno.email) {
      alert("Nome e email são obrigatórios");
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch('/api/admin/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoAluno)
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Aluno criado com sucesso!\nEmail de redefinição de senha enviado para ${novoAluno.email}`);
        setMostrarNovoAluno(false);
        setNovoAluno({
          full_name: "",
          email: "",
          cpf: "",
          phone: "",
          valor_mensal: "49.90",
          plan: "mensal"
        });
        fetchAlunos();
      } else {
        alert("Erro ao criar aluno: " + data.error);
      }
    } catch (error) {
      alert("Erro ao criar aluno");
    }
    setSalvando(false);
  }

  async function handleResetPassword(email: string) {
    setResetStatus('enviando');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/perfil`,
    });
    setResetStatus(error ? null : 'sucesso');
  }

  // Ordenação e filtro
  const alunosFiltrados = alunosComCupom
    .filter(a => (a.full_name?.toLowerCase().includes(filtro.toLowerCase()) || a.email?.toLowerCase().includes(filtro.toLowerCase())))
    .sort((a, b) => {
      let vA = a[sortCol] ?? '';
      let vB = b[sortCol] ?? '';
      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();
      if (vA < vB) return sortDir === 'asc' ? -1 : 1;
      if (vA > vB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-red-500" size={40} />
    </div>
  );

  return (
    <div className="p-8 lg:p-12 bg-black min-h-screen text-white font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
            Área da <span className="text-red-500">Secretaria</span>
          </h1>
          <p className="text-[10px] font-black uppercase text-zinc-700 tracking-widest mt-4 italic">Gestão de Membros e Graduações</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => setMostrarNovoAluno(true)}
            className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs px-6 py-3 rounded-xl transition-all"
          >
            + Novo Aluno
          </button>
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
            <input 
               placeholder="BUSCAR NOME OU EMAIL..." 
               className="w-full bg-black border border-zinc-900 p-5 pl-12 rounded-2xl text-[10px] font-black uppercase text-white outline-none focus:border-red-500 transition-all" 
               onChange={(e) => setFiltro(e.target.value)} 
            />
          </div>
        </div>
      </header>

      <div className="bg-black border border-zinc-900 rounded-[40px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-900 text-[9px] font-black uppercase tracking-widest text-zinc-600">
              <th className="p-8 cursor-pointer" onClick={() => handleSort('full_name')}>Membro {sortCol==='full_name' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th className="p-8 cursor-pointer" onClick={() => handleSort('plano_venda')}>Plano {sortCol==='plano_venda' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th className="p-8 cursor-pointer" onClick={() => handleSort('cupom')}>Cupom {sortCol==='cupom' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
              <th className="p-8 text-right cursor-pointer" onClick={() => handleSort('email')}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {alunosFiltrados.map(aluno => (
              <tr key={aluno.id} onClick={() => abrirDetalhes(aluno)} className="hover:bg-zinc-950 cursor-pointer transition-colors group">
                <td className="p-8">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-red-500 italic group-hover:border-red-500 transition-all text-xl uppercase">
                        {aluno.full_name?.[0] || "?"}
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase italic tracking-tight">{aluno.full_name || "Sem Nome"}</p>
                        <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">{aluno.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-8">
                  <span className={`text-[9px] font-black uppercase px-4 py-2 rounded-full border transition-all ${aluno.plano_venda === 'free' ? 'border-zinc-800 text-zinc-600' : 'border-red-600/20 text-red-500'}`}>{aluno.plano_venda || 'free'}</span>
                </td>
                <td className="p-8">
                  <span className="text-[9px] font-mono bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">{aluno.cupom || '-'}</span>
                </td>
                <td className="p-8 text-right">
                    <ChevronRight className="inline-block text-zinc-800 group-hover:text-red-500 transition-colors" size={20} />
                </td>
              </tr>
            ))}

            {/* Função handleSort movida para fora do JSX */}
          </tbody>
        </table>
      </div>

      {/* DRAWER LATERAL */}
      {alunoSelecionado && (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-zinc-950 border-l border-zinc-900 shadow-2xl z-[110] flex flex-col animate-in slide-in-from-right duration-500">
          <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-black">
            <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Dossiê: <span className="text-red-500">Membro</span></h2>
            <button onClick={() => setAlunoSelecionado(null)} className="text-zinc-600 hover:text-white transition-colors">
              <X size={24}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            {/* EDIÇÃO DE DADOS */}
            <section className="space-y-4">
              <p className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2">Dados Cadastrais</p>
              <div className="space-y-3">
                <input 
                  value={alunoSelecionado.full_name || ""} 
                  onChange={e => setAlunoSelecionado({...alunoSelecionado, full_name: e.target.value})} 
                  className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                  placeholder="Nome Completo"
                />
                <input 
                  value={alunoSelecionado.email || ""} 
                  onChange={e => setAlunoSelecionado({...alunoSelecionado, email: e.target.value})} 
                  className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                  placeholder="Email"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    value={alunoSelecionado.phone || ""} 
                    onChange={e => setAlunoSelecionado({...alunoSelecionado, phone: e.target.value})} 
                    className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                    placeholder="Telefone" 
                  />
                  <input 
                    value={alunoSelecionado.cpf || ""} 
                    onChange={e => setAlunoSelecionado({...alunoSelecionado, cpf: e.target.value})} 
                    className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                    placeholder="CPF" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    value={alunoSelecionado.instagram || ""} 
                    onChange={e => setAlunoSelecionado({...alunoSelecionado, instagram: e.target.value})} 
                    className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                    placeholder="Instagram" 
                  />
                  <select 
                    value={alunoSelecionado.plan || "free"} 
                    onChange={e => setAlunoSelecionado({...alunoSelecionado, plan: e.target.value})} 
                    className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-black text-red-500 uppercase outline-none focus:border-red-500"
                  >
                    <option value="free">Free</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                    <option value="vitalicio">Vitalício</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSalvarDados} disabled={salvando} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all">
                {salvando ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} SALVAR ALTERAÇÕES
              </button>
            </section>

            {/* ALTERAÇÃO DE SENHA */}
            <section className="space-y-4">
              <p className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2">Alterar Senha</p>
              <div className="space-y-3">
                <input 
                  type="password"
                  value={novaSenha} 
                  onChange={e => setNovaSenha(e.target.value)} 
                  className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                  placeholder="Nova senha (mínimo 6 caracteres)"
                />
                <button onClick={handleAlterarSenha} disabled={salvando} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-red-700 transition-all">
                  {salvando ? <Loader2 className="animate-spin" size={18}/> : <KeyRound size={18}/>} DEFINIR NOVA SENHA
                </button>
              </div>
            </section>

            {/* PERFORMANCE EM EXAMES (NOVO) */}
            <section className="space-y-4">
              <p className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2">Performance Pedagógica</p>
              <div className="space-y-2">
                {resultadosExames.length === 0 ? (
                    <p className="text-[9px] text-zinc-800 uppercase font-black italic p-4 border border-dashed border-zinc-900 rounded-2xl text-center">Nenhum exame realizado.</p>
                ) : (
                    resultadosExames.map((res: any) => (
                        <div key={res.id} className="bg-black border border-zinc-900 p-4 rounded-2xl flex justify-between items-center group/item">
                            <div>
                                <p className="text-[11px] font-black uppercase italic text-white">{res.cursos?.titulo}</p>
                                <p className="text-[9px] font-bold text-zinc-600 uppercase">Nota: {res.nota}% • {new Date(res.created_at).toLocaleDateString()}</p>
                            </div>
                            {res.aprovado ? (
                                <div className="flex items-center gap-2 text-green-500 font-black text-[9px] uppercase italic">
                                    <Award size={14} /> Graduado
                                </div>
                            ) : (
                                <div className="text-zinc-800 font-black text-[9px] uppercase italic">Pendente</div>
                            )}
                        </div>
                    ))
                )}
              </div>
            </section>

            {/* FINANCEIRO */}
            <section className="space-y-4">
                <p className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2">Histórico de Vendas</p>
                <div className="space-y-2">
                    {vendasAluno.map((v: any) => (
                        <div key={v.id} className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                            <span className="text-[10px] font-black text-zinc-500 uppercase">{v.plano || 'Checkout'}</span>
                            <span className="text-sm font-black italic text-white">R$ {v.valor}</span>
                        </div>
                    ))}
                </div>
            </section>
          </div>

          <div className="p-8 bg-black border-t border-zinc-900 flex flex-col gap-4">
            <button
              onClick={() => handleResetPassword(alunoSelecionado.email)}
              className="w-full border border-zinc-800 py-4 rounded-xl text-zinc-600 font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all"
            >
              {resetStatus === 'sucesso' ? <CheckCircle2 size={16} className="text-green-500"/> : <KeyRound size={16}/>} {resetStatus === 'sucesso' ? "E-mail Enviado" : "Enviar Email de Reset"}
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={salvando}
              className="w-full border border-red-600 py-4 rounded-xl text-red-600 font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
            >
              <X size={16}/> DELETAR USUÁRIO
            </button>
          </div>
        </div>
      )}

      {/* MODAL CRIAR NOVO ALUNO */}
      {mostrarNovoAluno && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-[40px] max-w-2xl w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-zinc-900 flex justify-between items-center">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">
                Criar <span className="text-red-500">Novo Aluno</span>
              </h2>
              <button onClick={() => setMostrarNovoAluno(false)} className="text-zinc-600 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2 block mb-2">Nome Completo *</label>
                  <input 
                    value={novoAluno.full_name} 
                    onChange={e => setNovoAluno({...novoAluno, full_name: e.target.value})} 
                    className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                    placeholder="Nome completo do aluno"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2 block mb-2">Email *</label>
                  <input 
                    type="email"
                    value={novoAluno.email} 
                    onChange={e => setNovoAluno({...novoAluno, email: e.target.value})} 
                    className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2 block mb-2">CPF</label>
                    <input 
                      value={novoAluno.cpf} 
                      onChange={e => setNovoAluno({...novoAluno, cpf: e.target.value})} 
                      className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2 block mb-2">Telefone</label>
                    <input 
                      value={novoAluno.phone} 
                      onChange={e => setNovoAluno({...novoAluno, phone: e.target.value})} 
                      className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2 block mb-2">Plano</label>
                    <select 
                      value={novoAluno.plan} 
                      onChange={e => setNovoAluno({...novoAluno, plan: e.target.value})} 
                      className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-black text-red-500 uppercase outline-none focus:border-red-500"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                      <option value="vitalicio">Vitalício</option>
                      <option value="free">Free</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em] ml-2 block mb-2">Valor Mensal (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={novoAluno.valor_mensal} 
                      onChange={e => setNovoAluno({...novoAluno, valor_mensal: e.target.value})} 
                      className="w-full bg-black border border-zinc-900 p-5 rounded-2xl text-xs font-bold text-white outline-none focus:border-red-500" 
                      placeholder="49.90"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">
                  ℹ️ Uma senha temporária será gerada automaticamente e um email será enviado para o aluno redefinir sua senha.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setMostrarNovoAluno(false)} 
                  className="flex-1 bg-zinc-900 text-zinc-400 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCriarNovoAluno} 
                  disabled={salvando}
                  className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="animate-spin" size={18}/> : <UserPlus size={18}/>} 
                  Criar Aluno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}