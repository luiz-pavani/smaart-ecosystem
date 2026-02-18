'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Users, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Class {
  id: string;
  modality_id: string;
  name: string;
  level: string;
  capacity: number;
  current_enrollment: number;
  location: string;
  is_active: boolean;
  requires_belt_level?: string;
  min_age_years?: number;
  max_age_years?: number;
}

interface Modality {
  id: string;
  name: string;
  type: string;
  color_code: string;
}

export default function ClassesManagementPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    modality_id: '',
    name: '',
    level: 'INTERMEDIARIO',
    capacity: 20,
    location: '',
    description: ''
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch modalities
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userRole } = await supabase
          .from('user_roles')
          .select('academia_id')
          .eq('user_id', user.id)
          .eq('role', 'academia_admin')
          .single();

        if (!userRole) throw new Error('Not authorized');

        const { data: modsData } = await supabase
          .from('modalities')
          .select('*')
          .eq('academy_id', userRole.academia_id)
          .eq('is_active', true);

        const { data: classesData } = await supabase
          .from('classes')
          .select('*')
          .eq('academy_id', userRole.academia_id)
          .order('created_at', { ascending: false });

        setModalities(modsData || []);
        setClasses(classesData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/academy/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create class');

      const result = await response.json();
      setClasses([result.class, ...classes]);
      setShowCreateModal(false);
      setFormData({
        modality_id: '',
        name: '',
        level: 'INTERMEDIARIO',
        capacity: 20,
        location: '',
        description: ''
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;
      setClasses(classes.filter(c => c.id !== classId));
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

  const getModality = (modalityId: string) => modalities.find(m => m.id === modalityId);
  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'INICIANTE': 'bg-green-100 text-green-800',
      'INTERMEDIARIO': 'bg-blue-100 text-blue-800',
      'AVANCADO': 'bg-purple-100 text-purple-800',
      'COMPETICAO': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Classes Management</h1>
            <p className="text-gray-600 mt-1">Manage all academy classes and schedules</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            New Class
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

        {classes.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-600 mb-6">Create your first class to start managing schedules and enrollments.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create First Class
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {classes.map(cls => {
              const modality = getModality(cls.modality_id);
              const enrollmentRate = (cls.current_enrollment / cls.capacity) * 100;

              return (
                <div key={cls.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{modality?.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/academy/classes/${cls.id}/edit`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="Edit class"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="Delete class"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Class Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      {/* Level */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Level</p>
                        <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${getLevelColor(cls.level)}`}>
                          {cls.level}
                        </span>
                      </div>

                      {/* Enrollment */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Enrollment</p>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <p className="font-bold text-gray-900">{cls.current_enrollment}/{cls.capacity}</p>
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
                        <p className="font-medium text-gray-900">{cls.location || '—'}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                        <span className={`inline-block text-xs font-bold px-2 py-1 rounded ${
                          cls.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {cls.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Enrollment Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Enrollment Rate</span>
                        <span className="text-sm font-bold text-gray-900">{enrollmentRate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            enrollmentRate >= 80
                              ? 'bg-red-500'
                              : enrollmentRate >= 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(enrollmentRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                      <Link
                        href={`/academy/classes/${cls.id}`}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        View Details
                      </Link>
                      <Link
                        href={`/academy/classes/${cls.id}/schedule`}
                        className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Schedule
                      </Link>
                      <Link
                        href={`/academy/classes/${cls.id}/enrollments`}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Manage Enrollments
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              {/* Modality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modality *
                </label>
                <select
                  required
                  value={formData.modality_id}
                  onChange={(e) => setFormData({...formData, modality_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a modality</option>
                  {modalities.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Judô Infantil"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="INICIANTE">Beginner</option>
                  <option value="INTERMEDIARIO">Intermediate</option>
                  <option value="AVANCADO">Advanced</option>
                  <option value="COMPETICAO">Competition</option>
                </select>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacity *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location/Room
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., Tatame A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Class details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
