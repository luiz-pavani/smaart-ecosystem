# SMAART PRO - Ecossistema Unificado

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Status:** Beta 6

Repositório centralizado para todas as aplicações e landing pages do SMAART PRO.

---

## 📁 Estrutura do Projeto

```
smaart-ecosystem/
├── apps/
│   ├── var-app/              # VAR - Video Analysis & Review (Beta 6)
│   ├── j1-app/               # J1 Analytics App
│   ├── titan/                # TITAN - Gerenciamento (Next.js)
│   ├── judolingo/            # Judolingo - Plataforma de Aprendizado
│   └── judo-analytics-web/   # (Reservado para expansão)
├── lp/
│   ├── main/                 # Master Landing Page (todos os apps)
│   ├── j1/                   # J1 App Landing Page
│   └── var/                  # VAR App Landing Page
├── profep-max/               # Profep Max - Plataforma de Treinamento
├── docs/                     # Documentação e guias
└── README.md                 # Este arquivo
```

---

## 🚀 Aplicações Incluídas

### 1. **VAR - Video Analysis & Review** (Beta 6)
- **Localização:** `apps/var-app/`
- **Tipo:** Web App (HTML/CSS/JavaScript)
- **Deploy:** Hostinger (var.smaartpro.com/APP)
- **Features:**
  - Análise de vídeo em tempo real
  - Replay com câmera lenta
  - Detecção automática de HAJIME/MATE
  - Tooltips com atalhos de teclado
  - Log de eventos com highlight

### 2. **J1 - Analytics App**
- **Localização:** `apps/j1-app/`
- **Tipo:** Web App (React/TypeScript)
- **Deploy:** Vercel (var.smaartpro.com/j1)
- **Features:**
  - Análise avançada de dados
  - Estatísticas de competições
  - Padrões de ataque e defesa

### 3. **TITAN - Gerenciamento**
- **Localização:** `apps/titan/`
- **Tipo:** Full-Stack (Next.js + TypeScript)
- **Deploy:** Vercel (smaartpro.com/titan)
- **Database:** Supabase
- **Features:**
  - Gerenciamento de eventos
  - Sistema de inscrições
  - Calendário e resultados
  - Documentação integrada

### 4. **Judolingo**
- **Localização:** `apps/judolingo/`
- **Tipo:** Plataforma de Aprendizado
- **Deploy:** Hostinger (smaartpro.com/judolingo)
- **Features:**
  - Conteúdo progressivo
  - Treinamento de técnicas
  - Desenvolvimento de judocas

### 5. **Profep Max**
- **Localização:** `profep-max/`
- **Tipo:** Web App (React/TypeScript)
- **Deploy:** Vercel (profepmax.com.br)
- **Features:**
  - Condicionamento físico
  - Programas personalizados
  - Acompanhamento de desempenho

---

## 🌐 Landing Pages

### Master Landing Page (`lp/main/`)
- Página principal que destaca os 5 apps
- URL: `https://smaartpro.com/`
- Cards interativos com links para cada aplicação
- Responsive design
- Seção "Sobre" com features

### J1 Landing Page (`lp/j1/`)
- Página específica para J1 Analytics
- URL: `https://var.smaartpro.com/`

### VAR Landing Page (`lp/var/`)
- Página específica para VAR App
- URL: `https://var.smaartpro.com/`

---

## 📋 Deployment Strategy

### Hostinger (smaartpro.com)
```
public_html/
├── index.html (master LP)
├── style.css
├── varapp/        → apps/var-app/
├── judolingo/     → apps/judolingo/
├── titan/         → apps/titan/
└── j1/            → apps/j1-app/
```

### Vercel (por app)
- **var.smaartpro.com:** lp/var (VAR Landing Page)
- **profepmax.com.br:** profep-max
- Considera redirecionar outras rotas

---

## 🔧 Instalação & Setup

### 1. **Clone o Repositório**
```bash
git clone https://github.com/luiz-pavanis-projects/smaart-ecosystem.git
cd smaart-ecosystem
```

### 2. **Instale Dependências (onde necessário)**

#### VAR App
```bash
# Não requer instalação (vanilla JS)
# Apenas execute o servidor local
python3 -m http.server 8000
```

#### J1 App
```bash
cd apps/j1-app
npm install
npm run dev
```

#### TITAN
```bash
cd apps/titan
npm install
npm run dev
# Acesse em http://localhost:3000
```

#### Profep Max
```bash
cd profep-max
npm install
npm run dev
```

### 3. **Variáveis de Ambiente**
Crie arquivos `.env.local` em cada app (onde necessário):
- `apps/titan/.env.local` - Supabase credentials
- `profep-max/.env.local` - API keys etc.

---

## 📦 Deploy para Hostinger

### Via Git Integration

1. **Criar repositório no GitHub:**
```bash
git remote add origin https://github.com/luiz-pavani/smaart-ecosystem.git
git branch -M main
git push -u origin main
```

2. **Em Hostinger (GIT Settings):**
   - Repository: `https://github.com/luiz-pavani/smaart-ecosystem.git`
   - Branch: `main`
   - Directory: (leave blank for root)

3. **Deploy dos apps individuais:**
   - **VAR App:** Criar novo deployment com Directory: `apps/var-app` → `varapp`
   - **Judolingo:** Directory: `apps/judolingo`
   - **TITAN:** Directory: `apps/titan` (com npm install/build)

---

## 🚀 Deploy para Vercel

### J1 App
```bash
cd apps/j1-app
vercel --prod
```

### Profep Max
```bash
cd profep-max
vercel --prod
```

### TITAN (Alternative)
```bash
cd apps/titan
vercel --prod
```

---

## 📱 URLs de Acesso

| App | Ambiente | URL |
|-----|----------|-----|
| **Master LP** | Hostinger | https://smaartpro.com/ |
| **VAR App** | Hostinger | https://var.smaartpro.com/APP/index.html |
| **VAR LP** | Vercel | https://var.smaartpro.com/ |
| **J1 Analytics** | Hostinger/Vercel | https://var.smaartpro.com/j1/ |
| **Judolingo** | Hostinger | https://smaartpro.com/judolingo/ |
| **TITAN** | Hostinger/Vercel | https://smaartpro.com/titan/ |
| **Profep Max** | Vercel | https://profepmax.com.br/ |

---

## 🔄 Workflow de Desenvolvimento

1. **Crie uma branch para sua feature:**
   ```bash
   git checkout -b feature/sua-feature
   ```

2. **Fazer mudanças na app específica:**
   ```bash
   cd apps/var-app
   # ou qualquer outra app
   ```

3. **Commit e Push:**
   ```bash
   git add .
   git commit -m "feat: descrição"
   git push origin feature/sua-feature
   ```

4. **Abra PR para review**

5. **Merge para `main` dispara auto-deploy** (em breve)

---

## 📚 Documentação Adicional

- [VAR App Docs](./docs/var-app.md)
- [TITAN Setup](./docs/titan-setup.md)
- [Deploy Guide](./docs/deploy-examples.md)
- [Automation Examples](./docs/automation-examples.md)

---

## 🛠️ Stack Tecnológico

| Layer | Tecnologia |
|-------|-----------|
| **VAR App** | HTML5, CSS3, JavaScript ES6+ |
| **J1 App** | React, TypeScript |
| **TITAN** | Next.js, TypeScript, Supabase |
| **Profep Max** | React, TypeScript |
| **Deploy** | Hostinger, Vercel, GitHub Actions |
| **Database** | Supabase (TITAN) |
| **Email** | Resend API (TITAN) |
| **Pagamentos** | Safe2Pay (TITAN) |

---

## 👥 Contribuidores

- **Luiz Pavani** - Product Owner & Developer
- **Gemini AI** - Architecture & Code Generation
- **GitHub Copilot** - Development Support

---

## 📝 Changelog

### v1.0 (Fevereiro 2026)
- ✅ Consolidação de todos os apps em repositório único
- ✅ Master Landing Page integrada
- ✅ VAR App Beta 6 (com tooltips e highlighting)
- ✅ Deployment strategy unificada
- ✅ Documentação centralizada

### Próximas melhorias:
- [ ] CI/CD automatizado com GitHub Actions
- [ ] Testes automatizados
- [ ] Monitoramento centralizado
- [ ] Dashboard de status das apps
- [ ] Analytics unificado

---

## 📞 Suporte

Para questões sobre deployment, arquitetura ou desenvolvimento:
- GitHub Issues: [smaart-ecosystem/issues](https://github.com/luiz-pavani/smaart-ecosystem/issues)
- Email: luiz.pavani@smaartpro.com

---

**Última atualização:** 10 de Fevereiro, 2026
