"use client";
import AppsGrid from "./AppsGrid";

export default function AppsSection() {
  return (
    <section style={{width:'100%',maxWidth:'900px',margin:'0 auto',padding:'2rem 1rem 4rem 1rem'}}>
      <h3 style={{fontSize:'1.5rem',fontWeight:800,color:'#DC2626',marginBottom:'2rem',letterSpacing:'-0.01em',textAlign:'center'}}>Apps em Destaque</h3>
      <AppsGrid />
    </section>
  );
}
