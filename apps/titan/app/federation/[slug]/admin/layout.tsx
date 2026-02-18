'use client';

import { use } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, Shield, Settings, ChevronRight } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Atletas', href: '/admin/atletas', icon: Users },
  { name: 'Acessos', href: '/admin/auths', icon: Shield },
  { name: 'Configurações', href: '/admin/configs', icon: Settings },
  { name: 'Planos', href: '/admin/plans', icon: LayoutDashboard },
];

export default function AdminLayout({ children, params }: AdminLayoutProps) {
  const { slug } = use(params);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Admin</h1>
          <p className="text-sm text-gray-400">{slug}</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminNavItems.map((item) => {
            const isActive = pathname.includes(item.href);
            return (
              <Link
                key={item.href}
                href={`/federation/${slug}${item.href}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-gray-700">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {children}
      </div>
    </div>
  );
}
