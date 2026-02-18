'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Award, CheckCircle2, AlertCircle, Clock, Plus } from 'lucide-react';

interface PendingPromotion {
  id: string;
  athlete: {
    id: string;
    nome: string;
    email: string;
  };
  modality_name: string;
  current_belt: string;
  next_belt: string;
  months_in_belt: number;
  training_days: number;
  requested_date: string;
  requested_by_instructor: string;
  requirements: {
    min_months: boolean;
    min_training_days: boolean;
    exam_passed?: boolean;
  };
}

interface BeltStats {
  modality: string;
  belt_distribution: Record<string, number>;
  upcoming_eligible: number;
}

export default function BeltProgressionPage() {
  const [loading, setLoading] = useState(true);
  const [pendingPromotions, setPendingPromotions] = useState<PendingPromotion[]>([]);
  const [beltStats, setBeltStats] = useState<BeltStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'stats'>('pending');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('academia_id')
          .eq('user_id', user.id)
          .eq('role', 'academia_admin')
          .single();

        if (!userRole) throw new Error('Not authorized');

        // Get pending promotions
        const { data: promotions } = await supabase
          .from('belt_progression')
          .select(`
            id,
            athlete:athlete_id(id, nome, email),
            modality:modality_id(name),
            current_belt,
            promotion_requested_date,
            promotion_requested_by,
            months_in_current_belt,
            training_days_completed,
            promotion_pending
          `)
          .eq('promotion_pending', true)
          .eq('academy_id', userRole.academia_id)
          .order('promotion_requested_date', { ascending: true });

        setPendingPromotions(promotions || []);

        // Get belt statistics by modality
        const { data: stats } = await supabase
          .from('belt_progression')
          .select('*')
          .eq('academy_id', userRole.academia_id);

        // Group by modality
        const grouped: Record<string, Record<string, number>> = {};
        stats?.forEach(stat => {
          if (!grouped[stat.modality_id]) {
            grouped[stat.modality_id] = {};
          }
          grouped[stat.modality_id][stat.current_belt] =
            (grouped[stat.modality_id][stat.current_belt] || 0) + 1;
        });

        // Format for display
        const formmattedStats: BeltStats[] = Object.entries(grouped).map(([modId, belts]) => ({
          modality: modId,
          belt_distribution: belts,
          upcoming_eligible: Object.values(belts).reduce((acc) => acc + 1, 0)
        }));

        setBeltStats(formmattedStats);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handlePromote = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from('belt_progression')
        .update({
          promotion_pending: false,
          promoted_date: new Date().toISOString()
        })
        .eq('id', promotionId);

      if (error) throw error;

      setPendingPromotions(
        pendingPromotions.filter(p => p.id !== promotionId)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectPromotion = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from('belt_progression')
        .update({
          promotion_pending: false
        })
        .eq('id', promotionId);

      if (error) throw error;

      setPendingPromotions(
        pendingPromotions.filter(p => p.id !== promotionId)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const colors: Record<string, string> = {
    'BRANCA': 'bg-white border-gray-300',
    'AZUL': 'bg-blue-100',
    'ROXA': 'bg-purple-100',
    'MARROM': 'bg-amber-100',
    'PRETA': 'bg-gray-900 text-white'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-8 w-8 text-amber-500" />
              Belt Progression System
            </h1>
            <p className="text-gray-600 mt-1">Manage athlete promotions and graduation tracking</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex gap-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 font-medium border-b-2 transition ${
              activeTab === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Promotions
              {pendingPromotions.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-sm font-bold">
                  {pendingPromotions.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 font-medium border-b-2 transition ${
              activeTab === 'stats'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Belt Statistics
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Pending Promotions Tab */}
        {activeTab === 'pending' && (
          <div>
            {pendingPromotions.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Promotions</h3>
                <p className="text-gray-600">All promotion requests have been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPromotions.map(promotion => (
                  <div key={promotion.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{promotion.athlete.nome}</h3>
                        <p className="text-sm text-gray-600">{promotion.athlete.email}</p>
                        <p className="text-sm text-gray-500 mt-1">{promotion.modality_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${colors[promotion.current_belt] || 'bg-gray-100'}`}>
                          <span className="text-xs font-bold">{promotion.current_belt?.slice(0, 1)}</span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${colors[promotion.next_belt] || 'bg-gray-100'}`}>
                          <span className="text-xs font-bold">{promotion.next_belt?.slice(0, 1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {promotion.requirements.min_months ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs text-gray-600">Months in Belt</p>
                          <p className="font-bold text-gray-900">{promotion.months_in_belt} months</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {promotion.requirements.min_training_days ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs text-gray-600">Training Days</p>
                          <p className="font-bold text-gray-900">{promotion.training_days}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600">Requested By</p>
                        <p className="font-bold text-gray-900">{promotion.requested_by_instructor || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handlePromote(promotion.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        <CheckCircle2 className="h-4 w-4 inline-block mr-2" />
                        Approve Promotion
                      </button>
                      <button
                        onClick={() => handleRejectPromotion(promotion.id)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {beltStats.map(modality => (
              <div key={modality.modality} className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{modality.modality}</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {Object.entries(modality.belt_distribution).map(([belt, count]) => (
                    <div
                      key={belt}
                      className={`p-4 rounded-lg border-2 text-center ${
                        colors[belt] || 'bg-gray-100'
                      }`}
                    >
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">
                        {belt}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-600 mt-1">Athletes</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {beltStats.length === 0 && (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Belt Data</h3>
                <p className="text-gray-600">Athlete belt progressions will appear here as they are tracked</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
