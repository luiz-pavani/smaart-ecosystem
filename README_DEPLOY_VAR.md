# Deploy Rápido do VAR no Vercel

## Passo a Passo

1. **Garanta que os diretórios estejam atualizados no Github:**
   - `lp/var/` (landing page)
   - `apps/var-app/` (aplicativo)
   - Ambos devem conter o arquivo `vercel.json` correto.

2. **No painel do Vercel:**
   - Clique em “Add New Project”.
   - Conecte o repositório Github.
   - Selecione `lp/var` para um projeto e `apps/var-app` para outro.
   - Configure o output como “static” (site estático).
   - Vercel fará o deploy automático.

3. **Acesse as URLs geradas pelo Vercel:**
   - Exemplo: `https://var.vercel.app` e `https://varapp.vercel.app`

4. **Configure o domínio personalizado:**
   - No painel de domínios do Vercel, adicione:
     - `smaartpro.com/var` → projeto `lp/var`
     - `smaartpro.com/varapp` → projeto `apps/var-app`
   - Siga as instruções do Vercel para apontar o domínio.

5. **Teste os links:**
   - `https://smaartpro.com/var/`
   - `https://smaartpro.com/varapp/`

---

Se precisar de ajuda com configuração de DNS, build ou domínios, consulte a documentação do Vercel ou peça instruções detalhadas aqui.
