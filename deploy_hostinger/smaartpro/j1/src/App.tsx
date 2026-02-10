import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import JudoPlayer from './JudoPlayer';
import LandingPage from './LandingPage';
import './index.css';

// Componente Wrapper para injetar a navegação na Landing Page
const LandingWrapper = () => {
  const navigate = useNavigate();
  // ATUALIZADO: Agora redireciona para /j1app
  return <LandingPage onStart={() => navigate('/j1app')} />;
};

function App() {
  return (
    <BrowserRouter>
      <div style={{ width: '100vw', height: '100dvh', margin: 0, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Rota 1: A Landing Page específica no /j1 */}
          <Route path="/j1" element={<div style={{ overflowY: 'auto', height: '100%' }}><LandingWrapper /></div>} />

          {/* Rota 2: O Aplicativo (ferramenta) agora no /j1app */}
          <Route path="/j1app" element={<JudoPlayer />} />

          {/* Rota Padrão: Se alguém entrar só na raiz, vai para a LP (/j1) */}
          <Route path="/" element={<Navigate to="/j1" replace />} />
          
          {/* Rota de segurança: Qualquer outra coisa vai para a LP */}
          <Route path="*" element={<Navigate to="/j1" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
