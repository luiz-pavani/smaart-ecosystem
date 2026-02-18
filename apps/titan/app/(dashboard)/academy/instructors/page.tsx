'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Users, Plus, Edit2, Trash2, Mail, Phone, Award, AlertCircle } from 'lucide-react';

interface Instructor {
  id: string;
  nome: string;
  email: string;
  telephone: string;
  registration_cref?: string;
  registration_caipe?: string;
  salary_type: string;
  salary_value: number;
  is_active: boolean;
  specializations?: Array<{modality: string; belt_certified_level: string}>;
}

export default function InstructorsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    telephone: '',
    registration_cref: '',
    registration_caipe: '',
    salary_type: 'FIXED',
    salary_value: 0,
    specializations: [] as Array<{modality: string; belt_certified_level: string}>
  });
  const [currentSpecialization, setCurrentSpecialization] = useState({
    modality: 'JUDO',
    belt_certified_level: 'PRETA'
  });
  const supabase = createClientComponentClient();

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

        const { data: instructorsData } = await supabase
          .from('instructors')
          .select('*, instructor_specializations(*)')
          .eq('academy_id', userRole.academia_id)
          .order('nome', { ascending: true });

        setInstructors(instructorsData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create instructor');

      const result = await response.json();
      setInstructors([result.instructor, ...instructors]);
      setShowCreateModal(false);
      setFormData({
        email: '',
        nome: '',
        telephone: '',
        registration_cref: '',
        registration_caipe: '',
        salary_type: 'FIXED',
        salary_value: 0,
        specializations: []
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteInstructor = async (instructorId: string) => {
    if (!confirm('Are you sure you want to remove this instructor?')) return;

    try {
      const { error } = await supabase
        .from('instructors')
        .update({ is_active: false })
        .eq('id', instructorId);

      if (error) throw error;
      setInstructors(instructors.filter(i => i.id !== instructorId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addSpecialization = () => {
    if (!formData.specializations.find(
      s => s.modality === currentSpecialization.modality
    )) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, currentSpecialization]
      });
      setCurrentSpecialization({ modality: 'JUDO', belt_certified_level: 'PRETA' });
    }
  };

  const removeSpecialization = (idx: number) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((_, i) => i !== idx)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-500" />
              Instructors Management
            </h1>
            <p className="text-gray-600 mt-1">Manage academy professors and instructors</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            Add Instructor
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

        {instructors.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No instructors yet</h3>
            <p className="text-gray-600 mb-6">Add your first instructor to start managing classes</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add First Instructor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instructors.map(instructor => (
              <div key={instructor.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{instructor.nome}</h3>
                    <p className="text-sm text-gray-600 mt-1">{instructor.salary_type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => console.log('Edit instructor')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      title="Edit instructor"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInstructor(instructor.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      title="Remove instructor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                  {instructor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{instructor.email}</span>
                    </div>
                  )}
                  {instructor.telephone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{instructor.telephone}</span>
                    </div>
                  )}
                </div>

                {/* Certifications */}
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Specializations</h4>
                  {instructor.specializations && instructor.specializations.length > 0 ? (
                    <div className="space-y-1">
                      {instructor.specializations.map((spec, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-sm text-gray-700">
                            {spec.modality} - {spec.belt_certified_level}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No specializations added</p>
                  )}
                </div>

                {/* Salary Info */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Salary</p>
                  <p className="text-lg font-bold text-gray-900">
                    R$ {instructor.salary_value?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">{instructor.salary_type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Instructor</h2>
            </div>

            <form onSubmit={handleCreateInstructor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@academy.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    placeholder="(48) 99999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* CREF */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CREF Number (PT)
                  </label>
                  <input
                    type="text"
                    value={formData.registration_cref}
                    onChange={(e) => setFormData({...formData, registration_cref: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Salary Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Type
                  </label>
                  <select
                    value={formData.salary_type}
                    onChange={(e) => setFormData({...formData, salary_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="FIXED">Fixed</option>
                    <option value="PER_CLASS">Per Class</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </select>
                </div>

                {/* Salary Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Value (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salary_value}
                    onChange={(e) => setFormData({...formData, salary_value: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Specializations */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Specializations</h4>
                <div className="space-y-2 mb-3">
                  {formData.specializations.map((spec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{spec.modality} - {spec.belt_certified_level}</span>
                      <button
                        type="button"
                        onClick={() => removeSpecialization(idx)}
                        className="text-red-600 hover:bg-red-100 p-1 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <select
                    value={currentSpecialization.modality}
                    onChange={(e) => setCurrentSpecialization({...currentSpecialization, modality: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="JUDO">Judô</option>
                    <option value="BJJ">Jiu-Jitsu</option>
                    <option value="GYM">Gym</option>
                  </select>
                  <select
                    value={currentSpecialization.belt_certified_level}
                    onChange={(e) => setCurrentSpecialization({...currentSpecialization, belt_certified_level: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="BRANCA">Branca</option>
                    <option value="AZUL">Azul</option>
                    <option value="ROXA">Roxa</option>
                    <option value="MARROM">Marrom</option>
                    <option value="PRETA">Preta</option>
                  </select>
                  <button
                    type="button"
                    onClick={addSpecialization}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
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
                  Add Instructor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
