"use client";

import { useEffect, useState } from "react";
// CORREÇÃO AQUI: 5 níveis de profundidade para chegar na raiz 'src'
import { supabase } from "../../../../../lib/supabase"; 
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function Classroom() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);

  useEffect(() => {
    async function loadClassroom() {
      // 1. Verifica login
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 2. Busca o Curso
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (courseData) {
        setCourse(courseData);

        // 3. Busca Módulos e Aulas JUNTOS
        const { data: modulesData } = await supabase
          .from("modules")
          .select("*, lessons(*)")
          .eq("course_id", courseData.id)
          .order("position", { ascending: true });
        
        // Ordena as aulas dentro de cada módulo
        if (modulesData) {
           modulesData.forEach(mod => {
             // Garante que as aulas fiquem na ordem 1, 2, 3...
             mod.lessons.sort((a: any, b: any) => a.position - b.position);
           });
           setModules(modulesData);

           // 4. Seleciona automaticamente a primeira aula para começar
           if (modulesData.length > 0 && modulesData[0].lessons.length > 0) {
             setActiveLesson(modulesData[0].lessons[0]);
           }
        }
      }
      
      setLoading(false);
    }

    loadClassroom();
  }, [slug, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white animate-pulse">Carregando Dojo...</div>;
  }

  if (!course) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-gray-900">Curso não encontrado.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-900 text-white font-sans">
      
      {/* 1. Área do Vídeo (Player) */}
      <div className="flex-1 flex flex-col h-[50vh] md:h-screen">
        {/* Header Interno */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition">
            ← Voltar
          </Link>
          <span className="font-bold text-gray-200 text-sm md:text-base">{course.title}</span>
        </div>

        {/* O Player */}
        <div className="flex-1 bg-black relative flex items-center justify-center">
           {activeLesson ? (
             <iframe 
               key={activeLesson.id} /* O SEGREDO: Isso força o React a recriar o player quando a aula muda */
               src={activeLesson.video_url} 
               className="w-full h-full absolute inset-0"
               frameBorder="0"
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               allowFullScreen
             ></iframe>
           ) : (
             <div className="text-center p-10 text-gray-500">
                <p>Nenhuma aula selecionada.</p>
             </div>
           )}
        </div>

        {/* Título da Aula Atual (Abaixo do vídeo) */}
        <div className="p-6 bg-gray-900 border-t border-gray-800">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            {activeLesson ? activeLesson.title : "Selecione uma aula"}
          </h1>
          <p className="text-gray-400 text-sm">
            {activeLesson?.description || "Assista ao vídeo para completar este módulo."}
          </p>
        </div>
      </div>

      {/* 2. Barra Lateral (Playlist) */}
      <div className="w-full md:w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto h-[50vh] md:h-screen flex flex-col">
        <div className="p-5 border-b border-gray-700 bg-gray-800 sticky top-0 z-10 shadow-lg">
          <h3 className="font-bold text-white">Conteúdo do Curso</h3>
          <div className="w-full bg-gray-700 h-1 mt-3 rounded-full overflow-hidden">
             <div className="bg-green-500 h-full w-[10%]"></div>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">10% Concluído</p>
        </div>

        {/* Lista Dinâmica */}
        <div className="flex-1 pb-10">
           {modules.map((module, index) => (
             <div key={module.id}>
               {/* Título do Módulo */}
               <div className="px-5 py-3 bg-gray-900/50 border-y border-gray-700/50 font-bold text-xs text-blue-200 uppercase tracking-wider mt-2">
                 {module.title}
               </div>
               
               {/* Aulas do Módulo */}
               {module.lessons.map((lesson: any, lessonIndex: number) => {
                 const isActive = activeLesson?.id === lesson.id;
                 return (
                   <button 
                     key={lesson.id}
                     onClick={() => setActiveLesson(lesson)}
                     className={`w-full text-left p-4 border-b border-gray-700/50 flex gap-4 transition group hover:bg-gray-700 ${isActive ? 'bg-gray-700 border-l-4 border-l-blue-500' : ''}`}
                   >
                     <span className={`text-sm font-bold ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                       {String(lessonIndex + 1).padStart(2, '0')}
                     </span>
                     <div>
                       <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                         {lesson.title}
                       </p>
                       <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                         ▶ {lesson.duration} min
                       </span>
                     </div>
                   </button>
                 );
               })}
             </div>
           ))}

           {modules.length === 0 && (
             <div className="p-10 text-center text-gray-500 text-sm">
               Nenhuma aula encontrada para este curso.
             </div>
           )}
        </div>
      </div>

    </div>
  );
}