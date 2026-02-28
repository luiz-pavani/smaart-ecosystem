"use client";

export default function AppsGrid() {
  const apps = [
    {
      name: "Titan",
      url: "https://titan.smaartpro.com",
      desc: "Gestão esportiva, competições e rankings automatizados."
    },
    {
      name: "Judo VAR",
      url: "https://var.smaartpro.com",
      desc: "Arbitragem digital, replay de vídeo e auditoria para competições."
    },
    {
      name: "J1 Analytics",
      url: "https://j1.smaartpro.com",
      desc: "Análise de desempenho, estatísticas e relatórios avançados."
    },
    {
      name: "Judolingo",
      url: "https://judolingo.com",
      desc: "Plataforma de ensino de judô online, gamificada e interativa."
    },
    {
      name: "Profep Max",
      url: "https://www.profepmax.com.br",
      desc: "Certificação digital, cursos e gestão de professores de educação física."
    }
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'2rem'}}>
      {apps.map(app => (
        <a
          key={app.url}
          href={app.url}
          target="_blank"
          rel="noopener"
          style={{
            background:'rgba(255,255,255,0.04)',
            border:'1px solid #222',
            borderRadius:'1.5rem',
            padding:'2rem 1.2rem',
            textAlign:'center',
            color:'#ededed',
            textDecoration:'none',
            boxShadow:'0 2px 16px 0 #23232a',
            transition:'transform 0.2s,box-shadow 0.2s',
            fontWeight:700,
            willChange:'transform',
            cursor:'pointer'
          }}
          onMouseOver={e=>{e.currentTarget.style.transform='scale(1.045)';e.currentTarget.style.boxShadow='0 8px 32px 0 #DC2626'}}
          onMouseOut={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 2px 16px 0 #23232a'}}
        >
          <div style={{fontSize:'1.2rem',fontWeight:900,marginBottom:'0.5rem',color:'#fff'}}>{app.name}</div>
          <div style={{fontSize:'1rem',color:'#bcbcbc',marginBottom:'0.5rem'}}>{app.desc}</div>
          <span style={{color:'#DC2626',fontWeight:700,fontSize:'0.98rem'}}>Acessar &rarr;</span>
        </a>
      ))}
    </div>
  );
}
