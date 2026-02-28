      import AppsSection from "./AppsSection";
      {/* Prova Social - Logos de parceiros */}
      <section style={{width:'100%',background:'rgba(20,20,20,0.95)',padding:'1.5rem 0',margin:'0 0 2rem 0',overflow:'hidden',borderTop:'1px solid #222',borderBottom:'1px solid #222'}}>
        <div style={{maxWidth:'900px',margin:'0 auto',overflow:'hidden',position:'relative'}}>
          <div style={{display:'flex',gap:'3rem',animation:'slide-logos 18s linear infinite',alignItems:'center'}}>
            <img src="/vercel.svg" alt="Vercel" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/next.svg" alt="Next.js" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/globe.svg" alt="Parceiro" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/window.svg" alt="Parceiro" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/file.svg" alt="Parceiro" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            {/* Repete para efeito infinito */}
            <img src="/vercel.svg" alt="Vercel" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/next.svg" alt="Next.js" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/globe.svg" alt="Parceiro" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/window.svg" alt="Parceiro" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
            <img src="/file.svg" alt="Parceiro" style={{height:'36px',opacity:0.5,filter:'grayscale(1)'}} />
          </div>
        </div>
      </section>


export default function Home() {
  return (
    <>
      {/* Navbar sticky premium */}
      <nav style={{position:'fixed',top:0,left:0,width:'100%',zIndex:40,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1.25rem 2rem',background:'rgba(5,5,5,0.7)',backdropFilter:'blur(8px)',borderBottom:'1px solid rgba(255,255,255,0.10)',boxShadow:'0 2px 16px 0 rgba(220,38,38,0.08)'}}>
        <span style={{fontSize:'2rem',fontWeight:900,fontStyle:'italic',color:'#ededed',letterSpacing:'-0.03em'}}>Smaart Pro</span>
      </nav>
      <main style={{ minHeight: '100vh', background: '#050505', color: '#ededed', display: 'flex', flexDirection:'column', alignItems: 'center', justifyContent: 'center', paddingTop:'6rem' }}>
        {/* Hero Section agressiva */}
        <section className="fade-in-up" style={{width:'100%',maxWidth:'640px',margin:'0 auto',textAlign:'center',padding:'4rem 1rem 2rem 1rem'}}>
          <h1 className="fade-in-up" style={{fontSize:'2.5rem',fontWeight:900,fontStyle:'italic',letterSpacing:'-0.03em',color:'#ededed',marginBottom:'1.5rem'}}>
            A EVOLUÇÃO DA SUA <span style={{color:'#DC2626',textShadow:'0 0 16px #DC2626'}}>PERFORMANCE TÉCNICA</span>
          </h1>
          <p style={{fontSize:'1.2rem',color:'#bcbcbc',marginBottom:'2rem',fontWeight:500}}>
            Plataforma premium para atletas, técnicos e federações. Gestão, performance e certificação digital em um só lugar.
          </p>
          {/* Mockup/Imagem placeholder */}
          <div style={{marginTop:'3rem',width:'100%',display:'flex',justifyContent:'center'}}>
            <div style={{borderRadius:'2rem',overflow:'hidden',border:'1px solid rgba(255,255,255,0.10)',background:'rgba(255,255,255,0.05)',boxShadow:'0 8px 40px 0 #DC2626',backdropFilter:'blur(8px)',padding:'1rem',maxWidth:'320px',width:'100%',height:'180px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'#bcbcbc',fontStyle:'italic'}}>[Mockup da Plataforma]</span>
            </div>
          </div>
        </section>
        {/* Sobre a Smaart Pro */}
        <section className="fade-in-up" style={{width:'100%',maxWidth:'720px',margin:'0 auto',padding:'2rem 1rem 0 1rem',textAlign:'center'}}>
          <h2 className="fade-in-up" style={{fontSize:'2rem',fontWeight:900,color:'#ededed',marginBottom:'1rem',letterSpacing:'-0.02em'}}>Sobre a Smaart Pro</h2>
          <p style={{fontSize:'1.1rem',color:'#bcbcbc',marginBottom:'2.5rem',fontWeight:500}}>
            Somos especialistas em desenvolvimento de apps personalizados, plataformas digitais e sites de alta performance para o ecossistema esportivo e educacional. Nossa missão é impulsionar resultados e criar experiências digitais de elite para atletas, técnicos, federações e empresas inovadoras.
          </p>
        </section>

        {/* Grid de Apps em Destaque */}
        <AppsSection />
      </main>
    </>
  );
}











