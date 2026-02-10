"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Loader2, Lock, ShieldCheck, CreditCard, ArrowRight } from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan') || 'mensal';
  const paymentMethodParam = searchParams.get('paymentMethod') || '6';
  const couponParam = searchParams.get('coupon') || '';
  
  const [perfil, setPerfil] = useState<any>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode?: string; key?: string; idTransaction?: number } | null>(null);
  const [coupon, setCoupon] = useState(couponParam);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponPercent, setCouponPercent] = useState(0);
  const [couponFixed, setCouponFixed] = useState(0);
  const [firstMonthPercent, setFirstMonthPercent] = useState(0);
  const [firstMonthFixed, setFirstMonthFixed] = useState(0);
  const [recurringPercent, setRecurringPercent] = useState(0);
  const [recurringFixed, setRecurringFixed] = useState(0);
  const [cepAutoFillEnabled, setCepAutoFillEnabled] = useState(true);
  const [cepManualHint, setCepManualHint] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [precos, setPrecos] = useState<any>({ mensal: "49.90", anual: "359.00", vitalicio: "997.00" });
  const [setPasswordNow, setSetPasswordNow] = useState(false);

  // Estados do formulário necessários para a tua API do Safe2Pay
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    senha: "",
    cpf: "",
    phone: "",
    paymentMethod: paymentMethodParam, // 6 = PIX, 1 = Boleto, 2 = Cartão
    zipCode: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    dueDate: "",
    cardNumber: "",
    cardHolder: "",
    cardExpiryMonth: "",
    cardExpiryYear: "",
    cardCVV: ""
  });

  useEffect(() => {
    async function carregarDados() {
      // 1. Obtém o utilizador autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLogged(true);
        // 2. Procura os dados importados (cond, origem, etc.)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setPerfil(data);
      } else {
        setIsLogged(false);
      }
      // 3. Buscar preços do banco de dados
      const { data: configs } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['preco_mensal', 'preco_anual', 'preco_vitalicio']);
      if (configs) {
        const precosObj: any = {};
        configs.forEach((config: any) => {
          const planType = config.chave.replace('preco_', '');
          precosObj[planType] = config.valor || (planType === 'mensal' ? '49.90' : planType === 'anual' ? '359.00' : '997.00');
        });
        setPrecos(precosObj);
      }
      setLoading(false);
    }
    carregarDados();
  }, []);

  // Auto-aplicar cupom da URL
  useEffect(() => {
    if (couponParam && !couponApplied) {
      handleApplyCoupon();
    }
  }, [couponParam, formData.paymentMethod]);

  // Revalida cupom quando método de pagamento mudar
  useEffect(() => {
    if (couponApplied && coupon) {
      handleApplyCoupon();
    }
  }, [formData.paymentMethod]);

  const handleCepChange = async (cep: string) => {
    setFormData({...formData, zipCode: cep});
    setCepManualHint(false);
    if (!cepAutoFillEnabled) return;
    
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          const isPartial = !data.logradouro || !data.bairro || !data.localidade || !data.uf;
          setCepManualHint(isPartial);
          setFormData(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            district: data.bairro || prev.district,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
        } else {
          setCepManualHint(true);
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        setCepManualHint(true);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponApplied(false);
    setCouponPercent(0);
    setCouponFixed(0);
    setFirstMonthPercent(0);
    setFirstMonthFixed(0);
    setRecurringPercent(0);
    setRecurringFixed(0);

    if (!coupon.trim()) {
      setCouponError('Insira um código de cupom');
      return;
    }

    try {
      const response = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: coupon.toUpperCase(),
          paymentMethod: formData.paymentMethod 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setCouponError(data.error || 'Cupom inválido');
        return;
      }

      // Guardar percentuais/valores para cálculo unificado (sempre sobre o preço base)
      setCouponPercent(data.discount_percent || 0);
      setCouponFixed(data.discount_fixed || 0);
      setFirstMonthPercent(data.first_month_discount_percent || 0);
      setFirstMonthFixed(data.first_month_discount_fixed || 0);
      setRecurringPercent(data.recurring_discount_percent || 0);
      setRecurringFixed(data.recurring_discount_fixed || 0);
      setCouponApplied(true);
    } catch (error) {
      console.error("Erro ao validar cupom:", error);
      setCouponError('Erro ao validar cupom');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (isSubmitting) return; // Evita múltiplos envios
    // Permitir checkout mesmo sem perfil completo. Só exige nome completo do titular se for cartão.
    if (formData.paymentMethod === "2" && (!formData.cardHolder || formData.cardHolder.trim().split(' ').length < 2)) {
      setFormError('Digite o nome completo do titular do cartão.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Se não estiver logado, cadastra antes de iniciar o pagamento.
      // Isso garante que exista um auth user + profiles.id = auth uid (fundamental para liberar cursos após o webhook).
      const ensureAuthForCheckout = async () => {
        if (isLogged) return;

        const email = (formData.email || '').trim().toLowerCase();
        const name = (formData.name || '').trim();
        const password = (formData.senha || '').trim();

        if (!email || !name) {
          throw new Error('Para continuar, preencha e-mail e nome.');
        }

        if (setPasswordNow && !password) {
          throw new Error('Você marcou “definir senha agora”. Digite uma senha para continuar.');
        }

        const regRes = await fetch('/api/auth/checkout-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, ...(password ? { password } : {}) })
        });

        const regData = await regRes.json();
        if (!regRes.ok) {
          throw new Error(regData.error || 'Erro ao cadastrar.');
        }

        // Se veio sessão, autentica imediatamente no client
        if (regData.session?.access_token && regData.session?.refresh_token) {
          try {
            await supabase.auth.setSession({
              access_token: regData.session.access_token,
              refresh_token: regData.session.refresh_token
            });
            setIsLogged(true);
          } catch (err) {
            // Mesmo sem setSession, o cadastro já garante o perfil para o webhook.
            console.warn('Falha ao autenticar automaticamente após cadastro:', err);
          }
        }

        // Atualiza estado mínimo do perfil local para o payload do checkout
        if (!perfil?.email) {
          setPerfil((prev: any) => prev || ({ email, full_name: name } as any));
        }

        // Mensagens amigáveis
        if (regData.needsSetPassword) {
          setFormError('Conta criada! Enviamos um e-mail para você definir sua senha e acessar os cursos. Você já pode concluir o pagamento agora.');
        } else if (regData.needsEmailConfirmation) {
          setFormError('Conta criada! Se necessário, confirme seu e-mail para acessar a plataforma. Você já pode concluir o pagamento agora.');
        }
      };

      await ensureAuthForCheckout();

      // Exibe loading
      setFormError('Processando pagamento... Aguarde.');
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planParam, 
          email: perfil?.email || formData.email,
          name: perfil?.full_name || formData.name || '',
          cpf: formData.cpf,
          phone: formData.phone || perfil?.phone,
          paymentMethod: formData.paymentMethod,
          address: {
            zipCode: formData.zipCode,
            street: formData.street,
            number: formData.number,
            district: formData.district,
            city: formData.city,
            state: formData.state
          },
          dueDate: formData.dueDate,
          card: {
            cardNumber: formData.cardNumber,
            cardHolder: formData.cardHolder,
            cardExpiryMonth: formData.cardExpiryMonth,
            cardExpiryYear: formData.cardExpiryYear,
            cardCVV: formData.cardCVV
          },
          coupon: coupon.trim()
        })
      });
      const data = await response.json();
      if (data.url) {
        if (perfil?.email || formData.email) {
          try { window.localStorage.setItem("lastCheckoutEmail", perfil?.email || formData.email); } catch {}
        }
        setFormError(null);
        window.location.href = data.url;
      } else if (data.pix) {
        if (perfil?.email || formData.email) {
          try { window.localStorage.setItem("lastCheckoutEmail", perfil?.email || formData.email); } catch {}
        }
        setFormError(null);
        setPixData(data.pix);
        setPixModalOpen(true);
      } else if (data.card) {
        if (perfil?.email || formData.email) {
          try { window.localStorage.setItem("lastCheckoutEmail", perfil?.email || formData.email); } catch {}
        }
        setFormError('Pagamento autorizado! Aguarde liberação dos cursos.');
        setTimeout(() => {
          window.location.href = "/cursos";
        }, 2000);
      } else if (data.boleto) {
        if (perfil?.email || formData.email) {
          try { window.localStorage.setItem("lastCheckoutEmail", perfil?.email || formData.email); } catch {}
        }
        setFormError('Boleto gerado! Aguarde confirmação do pagamento.');
        const { digitableLine, barcode, dueDate, bankSlipUrl } = data.boleto;
        if (bankSlipUrl) {
          setTimeout(() => {
            window.location.href = bankSlipUrl;
          }, 1500);
        } else {
          alert(`Boleto gerado. Linha digitável: ${digitableLine || 'indisponível'}. Vencimento: ${dueDate || '—'}`);
        }
      } else {
        console.error("Erro na resposta:", data);
        setFormError("Erro no pagamento: " + (data.error || "Tente novamente"));
      }
    } catch (err) {
      console.error("Erro ao processar checkout:", err);
      setFormError("Ocorreu um erro ao processar o checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={40} />
      </div>
    );
  }

  const isAtivo = perfil?.cond === 'ATIVO';
  
  // Informações do plano baseado no parâmetro
  const getPlanInfo = () => {
    const basePrice = parseFloat(precos[planParam] || '49.90');
    let planName = 'Mensal';
    let planPeriod = '/mês';
    const showCardDiscount = planParam === 'mensal' && formData.paymentMethod === "2";

    if (planParam === 'anual') {
      planName = 'Anual';
      planPeriod = '/ano';
    } else if (planParam === 'vitalicio') {
      planName = 'Vitalício';
      planPeriod = 'único';
    }

    return { basePrice, planName, planPeriod, showCardDiscount };
  };

  const planInfo = getPlanInfo();
  // Se houver cupom, não aplica desconto do cartão
  const hasAnyCoupon = couponApplied && (couponPercent > 0 || couponFixed > 0 || firstMonthPercent > 0 || firstMonthFixed > 0);
  const paymentDiscountPercent = planInfo.showCardDiscount && !hasAnyCoupon ? 20 : 0;
  const useFirstMonth = planParam === 'mensal' && (firstMonthPercent > 0 || firstMonthFixed > 0);
  const appliedPercent = useFirstMonth ? firstMonthPercent : couponPercent;
  const appliedFixed = useFirstMonth ? firstMonthFixed : couponFixed;
  const totalPercent = paymentDiscountPercent + appliedPercent;
  const priceAfterPercent = planInfo.basePrice * (1 - totalPercent / 100);
  const finalPriceNumber = appliedFixed > 0 ? appliedFixed : Math.max(priceAfterPercent, 0);
  const useRecurring = planParam === 'mensal' && (recurringPercent > 0 || recurringFixed > 0);
  const recurringTotalPercent = paymentDiscountPercent + recurringPercent;
  const recurringAfterPercent = planInfo.basePrice * (1 - recurringTotalPercent / 100);
  const recurringPriceNumber = recurringFixed > 0 ? recurringFixed : Math.max(recurringAfterPercent, 0);
  const discountValue = planInfo.basePrice - finalPriceNumber;
  const valorFinal = finalPriceNumber.toFixed(2).replace('.', ',');

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 selection:bg-red-500/30">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        
        {/* Coluna da Esquerda: Resumo e Benefícios */}
        <div className="space-y-8">
          <div>
            <h1 className="text-5xl font-black italic uppercase leading-none tracking-tighter">
              Finalizar <br />
              <span className="text-red-600">Matrícula</span>
            </h1>
            <p className="mt-4 text-zinc-500 font-medium">
              Olá, <span className="text-white font-bold">{perfil?.full_name}</span>. 
              {perfil?.origem ? `Confirmamos a tua migração do ${perfil.origem}.` : 'Complete sua matrícula no Profep MAX.'}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Plano Selecionado</p>
                <h3 className="text-xl font-bold uppercase italic">ProfepMax {planInfo.planName}</h3>
                <p className="text-[9px] text-zinc-600 uppercase mt-1">{planInfo.planPeriod}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Valor</p>
                <p className="text-3xl font-black italic">R$ {valorFinal}</p>
                {discountValue > 0 && (
                  <p className="text-[10px] text-green-400 font-black uppercase mt-1">-R$ {discountValue.toFixed(2).replace('.', ',')}</p>
                )}
              </div>
            </div>

            {couponApplied && (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3 text-green-500">
                <ShieldCheck size={20} />
                <span className="text-xs font-black uppercase tracking-tight">Cupom {coupon} aplicado com sucesso!</span>
              </div>
            )}

            {couponApplied && (firstMonthPercent > 0 || firstMonthFixed > 0 || recurringPercent > 0 || recurringFixed > 0) && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-blue-400 text-[10px] font-black uppercase tracking-widest space-y-2">
                {(firstMonthPercent > 0 || firstMonthFixed > 0) && (
                  <div>1º mês: R$ {finalPriceNumber.toFixed(2).replace('.', ',')}</div>
                )}
                {(recurringPercent > 0 || recurringFixed > 0) && (
                  <div>Demais meses: R$ {recurringPriceNumber.toFixed(2).replace('.', ',')}</div>
                )}
              </div>
            )}

            {/* Exibe desconto do cartão só se NÃO houver cupom */}
            {planInfo.showCardDiscount && !couponApplied && (
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3 text-green-500 mt-4">
                <CreditCard size={20} />
                <span className="text-xs font-black uppercase tracking-tight">20% OFF no Cartão Aplicado!</span>
              </div>
            )}
          </div>

          <ul className="space-y-4 text-sm text-zinc-400 font-bold uppercase tracking-tight italic">
            <li className="flex items-center gap-2">✓ Acesso Total ao AVA 2026</li>
            <li className="flex items-center gap-2">✓ Conteúdos de Judô Elite</li>
            <li className="flex items-center gap-2">✓ Suporte Prioritário</li>
            {planParam === 'anual' && <li className="flex items-center gap-2 text-red-400">✓ Economia de 50% vs Mensal</li>}
            {planParam === 'vitalicio' && <li className="flex items-center gap-2 text-yellow-400">✓ Acesso Para Sempre</li>}
          </ul>
        </div>

        {/* Coluna da Direita: Formulário de Pagamento */}
        <div className="bg-white text-black p-10 rounded-[48px] shadow-2xl shadow-red-600/10">
          <form className="space-y-6" onSubmit={handleCheckout}>
            {isLogged && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-[11px] text-zinc-700 font-semibold">
                Você está logado como <span className="font-black">{perfil?.email}</span>. Se quiser comprar com outro e-mail, faça logout e volte ao checkout.
                <button
                  type="button"
                  className="ml-2 text-red-600 font-black underline"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                    } finally {
                      setIsLogged(false);
                      setPerfil(null);
                      setFormData((prev) => ({ ...prev, email: '', name: '', senha: '' }));
                    }
                  }}
                >
                  Sair
                </button>
              </div>
            )}
            {/* Campos de cadastro para não logados */}
            {!isLogged && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">E-mail</label>
                  <input
                    required
                    type="email"
                    className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Nome completo</label>
                  <input
                    required
                    className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm uppercase"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Acesso à Plataforma</p>
                      <p className="text-[11px] text-zinc-700 font-semibold mt-1">
                        Sua conta será criada automaticamente com esse e-mail.
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Você pode definir a senha agora ou receber um link por e-mail para criar depois.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-black text-zinc-800 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={setPasswordNow}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSetPasswordNow(checked);
                          if (!checked) setFormData((prev) => ({ ...prev, senha: '' }));
                        }}
                      />
                      Definir senha agora
                    </label>
                  </div>

                  {setPasswordNow && (
                    <div className="space-y-1 mt-4">
                      <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Senha</label>
                      <input
                        type="password"
                        className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm"
                        placeholder="Crie uma senha segura"
                        value={formData.senha || ''}
                        onChange={e => setFormData({ ...formData, senha: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Campo nome para logados */}
            {isLogged && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Nome completo</label>
                <input
                  required
                  className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm uppercase"
                  placeholder="Nome completo"
                  value={perfil?.full_name || formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black uppercase italic text-xl">Pagamento Seguro</h2>
              <Lock size={18} className="text-zinc-300" />
            </div>

            {/* Método de Pagamento */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Método de Pagamento</label>
              <select 
                required 
                className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
              >
                <option value="6">PIX (Instantâneo)</option>
                <option value="1">Boleto Bancário</option>
                <option value="2">{planParam === 'mensal' ? '💳 Cartão de Crédito - 20% OFF (RECOMENDADO)' : 'Cartão de Crédito'}</option>
              </select>
              {formData.paymentMethod === "2" && planParam === 'mensal' && (
                !couponApplied && (
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-2 text-green-600 mt-2">
                    <CreditCard size={16} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Desconto de 20% aplicado no cartão!</span>
                  </div>
                )
              )}
            </div>

            {/* Cupom Promocional */}
            <div className="space-y-1 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
              <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Cupom Promocional (Opcional)</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  className="flex-1 bg-white p-4 rounded-xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm uppercase" 
                  placeholder="Digite seu código"
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value);
                    setCouponApplied(false);
                    setCouponPercent(0);
                    setCouponFixed(0);
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponApplied}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-black uppercase text-[9px] hover:bg-red-700 transition-all disabled:bg-green-600 disabled:cursor-default"
                >
                  {couponApplied ? '✓' : 'Aplicar'}
                </button>
              </div>
              {couponError && <p className="text-[10px] text-red-600 font-black mt-2">{couponError}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Confirmar CPF</label>
              <input 
                required 
                className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">WhatsApp</label>
              <input 
                required 
                className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            {/* Endereço */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">CEP</label>
              <input 
                required 
                className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                placeholder="00000-000"
                value={formData.zipCode}
                onChange={(e) => handleCepChange(e.target.value.replace(/\D/g, ''))}
              />
              {cepLoading && <p className="text-[8px] text-red-600 font-bold">Buscando endereço...</p>}
              {cepAutoFillEnabled && cepManualHint && (
                <div className="flex items-center justify-between text-[8px] text-zinc-500 font-bold mt-1">
                  <span>CEP sem logradouro? Preencha manualmente.</span>
                  <button
                    type="button"
                    className="text-[12px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl bg-red-600 text-white shadow-lg ring-2 ring-red-200/60 hover:bg-red-700 hover:ring-red-300/80 transition-all"
                    onClick={() => setCepAutoFillEnabled(false)}
                  >Digitar manualmente</button>
                </div>
              )}
              {!cepAutoFillEnabled && (
                <div className="flex items-center justify-between text-[8px] text-zinc-500 font-bold mt-1">
                  <span>Busca automática desativada.</span>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setCepAutoFillEnabled(true)}
                  >Ativar busca</button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Rua</label>
              <input 
                required 
                className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                placeholder="Rua..."
                value={formData.street}
                onChange={(e) => setFormData({...formData, street: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Número</label>
                <input 
                  required 
                  className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                  placeholder="123"
                  value={formData.number}
                  onChange={(e) => setFormData({...formData, number: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Bairro</label>
                <input 
                  required 
                  className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                  placeholder="Bairro"
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Cidade</label>
                <input 
                  required 
                  className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                  placeholder="Porto Alegre"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">UF</label>
                <input 
                  required 
                  maxLength={2}
                  className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm uppercase" 
                  placeholder="RS"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                />
              </div>
            </div>

            {/* Data de Vencimento (só para Boleto) */}
            {formData.paymentMethod === "1" && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Data de Vencimento</label>
                <input 
                  type="date"
                  className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  required
                />
              </div>
            )}

            {/* Cartão de Crédito (só para método 2) */}
            {formData.paymentMethod === "2" && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Número do Cartão</label>
                  <input 
                    className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                    placeholder="0000 0000 0000 0000"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({...formData, cardNumber: e.target.value.replace(/\D/g, '')})}
                    maxLength={16}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Titular do Cartão</label>
                  <input 
                    className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm uppercase" 
                    placeholder="NOME COMPLETO"
                    value={formData.cardHolder}
                    onChange={(e) => setFormData({...formData, cardHolder: e.target.value.toUpperCase()})}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Mês</label>
                    <input 
                      className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                      placeholder="MM"
                      value={formData.cardExpiryMonth}
                      onChange={(e) => setFormData({...formData, cardExpiryMonth: e.target.value.slice(0, 2)})}
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">Ano</label>
                    <input 
                      className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                      placeholder="YYYY"
                      value={formData.cardExpiryYear}
                      onChange={(e) => setFormData({...formData, cardExpiryYear: e.target.value.slice(0, 4)})}
                      maxLength={4}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-zinc-400 ml-4">CVV</label>
                    <input 
                      className="w-full bg-zinc-100 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 transition-all font-bold text-sm" 
                      placeholder="000"
                      value={formData.cardCVV}
                      onChange={(e) => setFormData({...formData, cardCVV: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {formError && (
              <div className="bg-red-100 text-red-700 p-4 rounded-xl font-black text-xs mb-2 border border-red-300">
                {formError}
              </div>
            )}
            <button 
              disabled={isSubmitting}
              className="w-full bg-black text-white p-6 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : (
                <> Finalizar Pagamento <ArrowRight size={18} /> </>
              )}
            </button>

            <div className="pt-4 flex flex-col items-center gap-2 opacity-30 grayscale font-black text-[8px] uppercase tracking-widest">
              <div className="flex gap-4">
                <CreditCard size={20} />
                <span>Safe2Pay Secure Environment</span>
              </div>
            </div>
          </form>
        </div>

      </div>

      {/* PIX Modal */}
      {pixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white text-black w-full max-w-md p-6 rounded-3xl shadow-2xl relative">
            <button
              aria-label="Fechar"
              className="absolute top-3 right-3 text-zinc-400 hover:text-black font-bold"
              onClick={() => { setPixModalOpen(false); setPixData(null); }}
            >✕</button>

            <h3 className="font-black uppercase italic text-lg mb-4">Pague com PIX</h3>

            {pixData?.qrCode ? (
              <img src={pixData.qrCode} alt="QR Code PIX" className="w-full rounded-2xl border border-zinc-200" />
            ) : (
              <div className="w-full h-48 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400">QR Code indisponível</div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-zinc-500 ml-1">Chave PIX</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={pixData?.key || ''}
                  className="flex-1 bg-zinc-100 p-3 rounded-xl font-mono text-xs border border-zinc-200"
                />
                <button
                  type="button"
                  className="px-4 py-3 rounded-xl bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-red-600"
                  onClick={async () => { if (pixData?.key) { try { await navigator.clipboard.writeText(pixData.key); } catch {} } }}
                >Copiar</button>
              </div>
            </div>

            <div className="mt-4 text-xs text-zinc-600">
              {pixData?.idTransaction && (
                <p>ID da Transação: <span className="font-mono">{pixData.idTransaction}</span></p>
              )}
              <p className="mt-2">Abra seu app bancário, escolha PIX e escaneie o QR Code ou cole a chave PIX acima. A confirmação pode levar até 5 minutos.</p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="px-6 py-3 rounded-xl bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600"
                onClick={() => { setPixModalOpen(false); setPixData(null); }}
              >Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={40} />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}