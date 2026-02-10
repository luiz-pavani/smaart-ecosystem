import React from 'react';
import { PlayCircle, BookOpen, Activity, MapPin, Zap, Keyboard, CheckCircle2 } from 'lucide-react';
import './LandingPage.css'; // Importa o novo arquivo de estilos

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="lp-container">
      
      {/* HERO SECTION */}
      <header className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-badge animate-pulse">
            <span className="lp-badge-dot"></span>
            <span className="lp-badge-text">NOVA VERSÃO BETA 3</span>
          </div>

          <h1 className="lp-title">
            SMAART<span className="text-primary">PRO J1</span>
          </h1>
          <p className="lp-subtitle">
            A plataforma definitiva de inteligência para o Judô de alto rendimento.
            <span className="lp-subtitle-highlight">Vídeo, Dados e Biomecânica em um único lugar.</span>
          </p>

          <div className="lp-cta-group">
            <button onClick={onStart} className="lp-btn lp-btn-primary">
               <PlayCircle size={24} /> ACESSAR O SISTEMA
            </button>
            <a href="#tutorial" className="lp-btn lp-btn-secondary">
                <BookOpen size={24} /> Ver Tutorial
            </a>
          </div>
        </div>
        <div className="lp-hero-glow"></div>
      </header>

      {/* FEATURES GRID */}
      <section className="lp-section lp-features">
        <div className="lp-container-inner">
            <div className="lp-grid-3">
                {/* Card 1 */}
                <div className="lp-card group">
                    <div className="lp-card-icon-wrapper icon-primary group-hover:scale-110">
                        <Activity className="text-primary" size={32} />
                    </div>
                    <h3 className="lp-card-title">Scouting Avançado</h3>
                    <p className="lp-card-text">Mapeamento completo de Nage-waza, Ne-waza e Kumi-kata com análise de direção e eficiência.</p>
                </div>
                {/* Card 2 */}
                <div className="lp-card group">
                    <div className="lp-card-icon-wrapper icon-yellow group-hover:scale-110">
                        <MapPin className="text-yellow" size={32} />
                    </div>
                    <h3 className="lp-card-title">Heatmaps & Radar</h3>
                    <p className="lp-card-text">Visualize onde os ataques acontecem no tatame e quais são as direções predominantes de desequilíbrio.</p>
                </div>
                {/* Card 3 */}
                <div className="lp-card group">
                    <div className="lp-card-icon-wrapper icon-red group-hover:scale-110">
                        <Zap className="text-red" size={32} />
                    </div>
                    <h3 className="lp-card-title">Auto-Soremade</h3>
                    <p className="lp-card-text">Regras da FIJ integradas. O sistema detecta Ippon, 3 Shidos ou Hansoku e encerra o cronômetro automaticamente.</p>
                </div>
            </div>
        </div>
      </section>

      {/* TUTORIAL / SHORTCUTS */}
      <section id="tutorial" className="lp-section lp-tutorial">
        <div className="lp-container-inner">
            <div className="lp-grid-2-auto">
                
                {/* Left: Instructions */}
                <div className="lp-tutorial-left">
                    <h2 className="lp-section-title">
                        <Keyboard className="text-primary" size={32} /> Comandos de Elite
                    </h2>
                    <p className="lp-section-text">
                        Para análise em tempo real, velocidade é tudo. Use os atalhos de teclado para registrar ações sem tirar os olhos da luta.
                    </p>

                    <div className="lp-shortcuts-list">
                        <div className="lp-shortcut-item">
                            <span className="lp-shortcut-label">Pause/Play Luta (Hajime/Mate)</span>
                            <kbd className="lp-kbd">ESPAÇO</kbd>
                        </div>
                        <div className="lp-shortcut-item">
                            <span className="lp-shortcut-label text-yellow">Registrar Shido</span>
                            <kbd className="lp-kbd">S</kbd>
                        </div>
                        <div className="lp-shortcut-item">
                            <span className="lp-shortcut-label text-primary">Registrar Ippon / Waza-ari</span>
                            <div className="flex gap-2">
                                <kbd className="lp-kbd">I</kbd>
                                <kbd className="lp-kbd">W</kbd>
                            </div>
                        </div>
                        <div className="lp-shortcut-item">
                            <span className="lp-shortcut-label">Modo Desenho (Telestrator)</span>
                            <kbd className="lp-kbd">D</kbd>
                        </div>
                    </div>
                </div>

                {/* Right: Rules Summary */}
                <div className="lp-tutorial-right lp-card">
                    <h3 className="lp-card-title border-b pb-4 mb-6" style={{ borderColor: 'var(--lp-border)' }}>Regras do Sistema (FIJ)</h3>
                    <ul className="lp-rules-list">
                        <li>
                            <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                            <span><strong>Cronômetro Inteligente:</strong> Regressivo (4min) no tempo regular, Progressivo no Golden Score.</span>
                        </li>
                        <li>
                            <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                            <span><strong>Waza-ari Awasete Ippon:</strong> O 2º Waza-ari é convertido automaticamente para Ippon.</span>
                        </li>
                        <li>
                            <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                            <span><strong>Hansoku Acumulado:</strong> O 3º Shido dispara automaticamente o Hansoku-Make.</span>
                        </li>
                        <li>
                            <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={20} />
                            <span><strong>Gestão de Dados:</strong> O sistema limpa o log automaticamente ao carregar um novo vídeo.</span>
                        </li>
                    </ul>
                    
                    <div className="lp-tip-box">
                        <p className="lp-tip-text">
                            💡 Dica: Use o botão "Relatório" para gerar PDFs técnicos completos.
                        </p>
                    </div>
                </div>

            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container-inner text-center">
            <p className="lp-footer-text">SMAART PRO J1 © 2026 - Desenvolvido para Alta Performance.</p>
            <p className="lp-footer-subtext">Supervisão: Luiz Pavani - Diretor Educacional</p>
        </div>
      </footer>
    </div>
  );
}