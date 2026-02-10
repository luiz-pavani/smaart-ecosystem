import Link from "next/link";
import { supabase } from "../../lib/supabase";

export const revalidate = 0;

export default async function LandingPage() {
  // 1. Busca os PLANOS ativos (Ordenados pelo preço)
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_monthly", { ascending: true });

  // 2. Busca os CURSOS (para mostrar a vitrine abaixo)
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-50">
        <h1 className="text-2xl font-black tracking-tighter text-blue-900">
          PROFEP<span className="text-blue-600">MAX</span>
        </h1>
        <div className="space-x-4 flex items-center">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">
            Área do Aluno
          </Link>
          <Link 
            href="/login" 
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            ENTRAR
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-white pt-20 pb-28 text-center px-4 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-50 rounded-full blur-3xl -z-10 opacity-60"></div>
          
          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold mb-6 tracking-wide uppercase">
            Evolução Contínua
          </span>
          <h2 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 max-w-4xl mx-auto leading-tight tracking-tight">
            Domine o Judô e a <br/>
            <span className="text-blue-600">Gestão Esportiva</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            A plataforma completa para professores, atletas e gestores. 
            Do tatame à administração do seu dojo.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#planos" className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-200">
              Ver Planos de Acesso
            </a>
            <a href="#cursos" className="bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition">
              Cursos Avulsos
            </a>
          </div>
        </section>

        {/* SEÇÃO DE PLANOS (O CORAÇÃO DO NEGÓCIO) */}
        <section id="planos" className="py-20 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Escolha sua Jornada</h3>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Assine e tenha acesso ilimitado aos conteúdos da sua categoria.
              Cancele quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans?.map((plan) => (
              <div key={plan.id} className={`relative flex flex-col p-6 rounded-2xl border ${plan.category_access === 'all' ? 'border-blue-600 shadow-2xl scale-105 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-900'} hover:shadow-xl transition duration-300`}>
                
                {plan.category_access === 'all' && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Mais Popular
                  </div>
                )}

                <div className="mb-4">
                  <h4 className={`text-lg font-bold ${plan.category_access === 'all' ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h4>
                  <p className={`text-sm mt-2 ${plan.category_access === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {plan.description || "Acesso completo à categoria."}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold">R$ {plan.price_monthly}</span>
                  <span className={`text-sm ${plan.category_access === 'all' ? 'text-blue-100' : 'text-gray-400'}`}>/mês</span>
                  <div className={`text-xs mt-1 ${plan.category_access === 'all' ? 'text-blue-200' : 'text-green-600'}`}>
                    Ou R$ {plan.price_yearly} /ano
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {/* Lista de features fictícia baseada no plano */}
                  <li className="flex items-center gap-2 text-sm">
                    <svg className={`w-5 h-5 ${plan.category_access === 'all' ? 'text-yellow-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Acesso a {plan.category_access === 'all' ? 'TODOS' : 'cursos selecionados'}
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <svg className={`w-5 h-5 ${plan.category_access === 'all' ? 'text-yellow-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Certificado de Conclusão
                  </li>
                  {plan.category_access === 'all' && (
                     <li className="flex items-center gap-2 text-sm">
                       <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                       Mentoria Mensal
                     </li>
                  )}
                </ul>

                <button className={`w-full py-3 rounded-lg font-bold transition ${
                  plan.category_access === 'all' 
                    ? 'bg-white text-blue-600 hover:bg-gray-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                  Assinar Agora
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Lista de Cursos Avulsos (Secundário) */}
        <section id="cursos" className="py-16 px-6 max-w-6xl mx-auto border-t border-gray-200">
          <div className="flex justify-between items-end mb-8">
             <div>
                <h3 className="text-2xl font-bold text-gray-900">Catálogo de Cursos</h3>
                <p className="text-gray-500">Prefere comprar avulso? Veja nossas opções.</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {courses && courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="group border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition duration-300 bg-white flex flex-col">
                  {/* Imagem */}
                  <div className="h-48 bg-gray-200 relative overflow-hidden">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">Sem Imagem</div>
                    )}
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition">
                      {course.title}
                    </h4>
                    
                    {/* Preço e Botão */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <span className="text-lg font-bold text-gray-900">
                        R$ {course.price}
                      </span>
                      
                      <Link 
                        href={`/cursos/${course.slug}`} 
                        className="text-blue-600 font-bold text-sm hover:underline"
                      >
                        Detalhes →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">Nenhum curso avulso disponível no momento.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Simples */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <p>© 2026 ProfepMax. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}