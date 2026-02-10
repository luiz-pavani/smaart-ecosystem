import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

// Garante que a página sempre busque dados novos no banco
export const revalidate = 0;

export default async function LandingPage() {
  // Buscamos os cursos publicados
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-50">
        <h1 className="text-2xl font-black tracking-tighter text-blue-900">
          PROFEP<span className="text-blue-600">MAX</span>
        </h1>
        <div className="space-x-4">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">
            Área do Aluno
          </Link>
          
          {/* ATUALIZAÇÃO AQUI: Botão agora é um Link para o Login */}
          <Link 
            href="/login" 
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="bg-gray-50 py-20 text-center px-4">
          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold mb-6 tracking-wide uppercase">
            Plataforma 2026
          </span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 max-w-4xl mx-auto leading-tight">
            A Evolução do Ensino <br/>de <span className="text-blue-600">Judô e Gestão</span>.
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Do Nage-no-Kata à Gestão Esportiva. A plataforma definitiva para quem vive o Judô dentro e fora do tatame.
          </p>
        </section>

        {/* Lista de Cursos */}
        <section className="py-16 px-6 max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold mb-8 text-gray-900">Cursos Disponíveis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {courses && courses.length > 0 ? (
              courses.map((course) => (
                <div key={course.id} className="group border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition duration-300 bg-white flex flex-col">
                  {/* Imagem do Curso */}
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
                  
                  {/* Conteúdo do Card */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h4 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-blue-600 transition">
                      {course.title}
                    </h4>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                      {course.description}
                    </p>
                    
                    {/* Preço e Botão de Link */}
                    <div className="flex items-center justify-between mt-4 border-t pt-4">
                      <span className="text-lg font-bold text-green-700">
                        R$ {course.price}
                      </span>
                      
                      <Link 
                        href={`/cursos/${course.slug}`} 
                        className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"
                      >
                        Ver Detalhes →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">Nenhum curso publicado ainda.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}