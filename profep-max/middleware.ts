import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inicializa a resposta padrão
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Configura o cliente Supabase SSR para manter a sessão ativa entre subdomínios
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Verifica o estado da sessão (opcional para o roteamento, mas bom para segurança)
  await supabase.auth.getUser()

  // 4. LÓGICA DE SUBDOMÍNIO (Multi-tenancy)
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const path = url.pathname

  // 4.1 SHORT LINKS DE CUPOM (ex: /promo/VIP50)
  if (path.startsWith('/promo/')) {
    const code = path.split('/')[2]
    if (code) {
      const params = url.searchParams.toString()
      const target = `/checkout?coupon=${encodeURIComponent(code)}${params ? `&${params}` : ''}`
      return NextResponse.redirect(new URL(target, request.url))
    }
  }
  
  // Define o domínio raiz com base no seu .env ou padrão localhost
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  
  // Extrai o subdomínio (ex: de 'lrsj.localhost:3000' extrai 'lrsj')
  const subdomain = hostname.replace(`.${rootDomain}`, '')

  // Se for domínio raiz, www, ou hostname sem subdomínio válido, não reescreve.
  if (hostname === rootDomain || subdomain === hostname || subdomain === 'www') {
    return response
  }

  // 5. REESCRITA DE ROTA (Onde o 404 é resolvido)
  // Se houver um subdomínio, redirecionamos internamente para /federation/[slug]
  // Note que usamos 'federation' sem underline, conforme sua alteração de pasta
  if (!url.pathname.startsWith('/federation') && !url.pathname.startsWith('/api')) {
    const searchParams = url.searchParams.toString()
    const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`
    
    // Faz o "de-para": lrsj.lvh.me:3000/candidato -> /federation/lrsj/candidato
    return NextResponse.rewrite(
      new URL(`/federation/${subdomain}${path}`, request.url)
    )
  }

  return response
}

// Configuração do Matcher: Define quais caminhos o middleware deve ignorar
export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e pastas internas do Next.js
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}