'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Zap, Clock, TrendingUp, Plus, Settings, BarChart3, Calendar, DollarSign, Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  success: boolean;
  accessLevel: string;
  requiresSelection?: boolean;
  academias?: Array<{ id: string; nome: string; sigla: string }>;
  academy: { id: string; name: string; sigla: string };
  metrics: {
    total_athletes: number;
    total_classes: number;
    total_instructors: number;
    total_modalities: number;
    today_attendance: number;
    today_attendance_rate: number | string;
  };
  athletes_by_modality: Array<{modality_id: string; modality_name: string; athlete_count: number}>;
  top_classes: Array<any>;
  modalities: Array<{id: string; name: string; type: string}>;
}

export default function AcademyDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMasterAccess, setIsMasterAccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const academyId = searchParams.get('academyId');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check user role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Não autenticado");
          return;
        }

        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1);

        const isMaster = userRoles?.some(r => r.role === "master_access");
        setIsMasterAccess(!!isMaster);

        // If master_access and no academy selected, redirect to selector
        if (isMaster && !academyId) {
          router.push('/academy/select');
          return;
        }

        // Fetch dashboard data
        let url = '/api/academy';
        if (academyId) {
          url += `?academyId=${academyId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load dashboard');
        }
        const result = await response.json();

        // If academy requires selection and we got the list, redirect to selector
        if (result.requiresSelection) {
          router.push('/academy/select');
          return;
        }

        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [academyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        Erro ao carregar dashboard: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div className="flex items-center gap-4 flex-1">
            {isMasterAccess && (
              <button
                onClick={() => router.push('/academy/select')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition"
                title="Trocar de Academia"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data?.academy.name}</h1>
              <p className="text-gray-600 mt-1">
                Academia Dashboard • {data?.academy.sigla}
                {isMasterAccess && <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Master Access</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/academy/settings"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
            <Link
              href="/academy/classes/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              <Plus className="h-4 w-4" />
              Nova Turma
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Athletes */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium text-sm">Total Athletes</h3>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.metrics.total_athletes}</p>
            <p className="text-sm text-gray-500 mt-2">Active members</p>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium text-sm">Total Classes</h3>
              <Calendar className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.metrics.total_classes}</p>
            <p className="text-sm text-gray-500 mt-2">Active classes</p>
          </div>

          {/* Instructors */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium text-sm">Instructors</h3>
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.metrics.total_instructors}</p>
            <p className="text-sm text-gray-500 mt-2">Active teachers</p>
          </div>

          {/* Today's Attendance */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium text-sm">Today Attendance</h3>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{data?.metrics.today_attendance}</p>
            <p className="text-sm text-gray-500 mt-2">{data?.metrics.today_attendance_rate}% average rate</p>
          </div>
        </div>

        {/* Modalities & Top Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Modalities */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Modalities</h2>
            <div className="space-y-2">
              {data?.modalities.map(mod => (
                <Link
                  key={mod.id}
                  href={`/academy/modalities/${mod.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <span className="font-medium text-gray-700">{mod.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {mod.type}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/academy/modalities/new"
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              <Plus className="h-4 w-4" />
              Add Modality
            </Link>
          </div>

          {/* Athletes by Modality */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Athletes by Modality</h2>
            <div className="space-y-3">
              {data?.athletes_by_modality.map(item => (
                <div key={item.modality_id} className="flex items-center justify-between">
                  <span className="text-gray-600">{item.modality_name}</span>
                  <span className="font-bold text-gray-900">{item.athlete_count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-bold text-gray-900">{data?.metrics.total_athletes}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href="/academy/classes"
                className="block w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Manage Classes
              </Link>
              <Link
                href="/academy/instructors"
                className="block w-full px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Manage Instructors
              </Link>
              <Link
                href="/academy/attendance"
                className="block w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Check Attendance
              </Link>
              <Link
                href="/academy/financial"
                className="block w-full px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Financial Center
              </Link>
              <Link
                href="/academy/federation"
                className="block w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Federation Integration
              </Link>
            </div>
          </div>
        </div>

        {/* Top Classes */}
        {data?.top_classes && data.top_classes.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Top Performing Classes</h2>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {data.top_classes.slice(0, 5).map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{cls.name}</p>
                    <p className="text-sm text-gray-500">{cls.current_enrollment}/{cls.capacity} enrolled</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{cls.enrollment_rate?.toFixed(0)}%</p>
                    <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition"
                        style={{ width: `${Math.min(cls.enrollment_rate || 0, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
