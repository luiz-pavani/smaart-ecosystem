/** Campos e seções do wizard de registro de atleta. */

export const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors'

export function Campo({ label, obrigatorio, children, className = '' }: { label: string; obrigatorio?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
        {label}{obrigatorio && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-white font-bold">{titulo}</h3>
        {descricao && <p className="text-slate-400 text-sm mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}

