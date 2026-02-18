'use client';

import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { QrCode, Users, Clock, CheckCircle2, AlertCircle, Camera, X } from 'lucide-react';
import jsQR from 'jsqr';

interface ClassSession {
  id: string;
  name: string;
  modality_name: string;
  current_enrollment: number;
  capacity: number;
  start_time: string;
  end_time: string;
  location: string;
}

interface AthleteCheckIn {
  athlete_id: string;
  athlete_name: string;
  belt: string;
  check_in_time: string;
  status: 'success' | 'already_checked' | 'error';
  message: string;
}

export default function AttendanceCheckInPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<AthleteCheckIn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [manualAthletId, setManualAthletId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
          .in('role', ['academia_admin', 'professor'])
          .single();

        if (!userRole) throw new Error('Not authorized');

        // Get today's classes with enrollments
        const today = new Date().toISOString().split('T')[0];
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, name, location, is_active, modality_id, capacity, current_enrollment, class_schedules(start_time, end_time, day_of_week), modality:modality_id(name)')
          .eq('academy_id', userRole.academia_id)
          .eq('is_active', true)
          .limit(10);

        // Format classes data
        const formattedClasses = classesData?.map(cls => ({
          id: cls.id,
          name: cls.name,
          modality_name: cls.modality?.name || 'Unknown',
          current_enrollment: cls.current_enrollment || 0,
          capacity: cls.capacity,
          start_time: cls.class_schedules?.[0]?.start_time || '',
          end_time: cls.class_schedules?.[0]?.end_time || '',
          location: cls.location
        })) || [];

        setClasses(formattedClasses);
        if (formattedClasses.length > 0) {
          setSelectedClass(formattedClasses[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  // Initialize camera
  useEffect(() => {
    if (showCamera && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          setError('Could not access camera: ' + err.message);
        });
    }

    return () => {
      // Stop camera when unmounting
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const handleQRScan = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      // Assume QR contains athlete ID
      await performCheckIn(code.data);
      setShowCamera(false);
    }
  };

  const performCheckIn = async (athleteId: string) => {
    if (!selectedClass) return;

    try {
      const response = await fetch('/api/academy/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_id: athleteId,
          class_id: selectedClass,
          check_in_method: 'QR_CODE'
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Get athlete info
        const { data: athlete } = await supabase
          .from('atletas')
          .select('nome, user_roles(role)')
          .eq('id', athleteId)
          .single();

        const checkInRecord: AthleteCheckIn = {
          athlete_id: athleteId,
          athlete_name: athlete?.nome || 'Unknown',
          belt: 'N/A',
          check_in_time: new Date().toLocaleTimeString('pt-BR'),
          status: 'success',
          message: 'Check-in successful!'
        };

        setCheckIns([checkInRecord, ...checkIns]);
      } else {
        // Handle error (already checked in, etc)
        const checkInRecord: AthleteCheckIn = {
          athlete_id: athleteId,
          athlete_name: athleteId,
          belt: 'N/A',
          check_in_time: new Date().toLocaleTimeString('pt-BR'),
          status: result.error?.includes('already') ? 'already_checked' : 'error',
          message: result.error || 'Check-in failed'
        };
        setCheckIns([checkInRecord, ...checkIns]);
      }

      // Reset inputs
      setManualAthletId('');
    } catch (err: any) {
      setError('Check-in error: ' + err.message);
    }
  };

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualAthletId.trim()) {
      performCheckIn(manualAthletId.trim());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const todayCheckIns = checkIns;
  const successCount = checkIns.filter(c => c.status === 'success').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Attendance Check-in</h1>
          <p className="text-gray-600 mt-1">Manage real-time attendance using QR codes or manual entry</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Check-in Interface */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Class Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Select Class</h2>
              <div className="space-y-2">
                {classes.length === 0 ? (
                  <p className="text-gray-600">No classes available</p>
                ) : (
                  classes.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClass(cls.id)}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        selectedClass === cls.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{cls.name}</p>
                          <p className="text-sm text-gray-600">{cls.modality_name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {cls.start_time} - {cls.end_time} • {cls.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{cls.current_enrollment}/{cls.capacity}</p>
                          <p className="text-xs text-gray-500">Enrolled</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Check-in Methods */}
            {selectedClass && (
              <div className="space-y-4">
                {/* QR Code Scanner */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Code Scanner
                  </h3>

                  {!showCamera ? (
                    <button
                      onClick={() => setShowCamera(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                    >
                      <Camera className="h-4 w-4" />
                      Open Camera
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-auto"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* QR Scanning Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center'>
                          <div className="w-48 h-48 border-4 border-green-400 rounded-lg opacity-50"></div>
                        </div>
                      </div>

                      <button
                        onClick={handleQRScan}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        Scan QR
                      </button>

                      <button
                        onClick={() => setShowCamera(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        <X className="h-4 w-4" />
                        Close Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Manual Check-in */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Manual Check-in</h3>
                  <form onSubmit={handleManualCheckIn} className="space-y-3">
                    <input
                      type="text"
                      value={manualAthletId}
                      onChange={(e) => setManualAthletId(e.target.value)}
                      placeholder="Enter Athlete ID or Email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Check In
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Right: Check-in Summary */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Summary</h3>

              {selectedClass && classes.find(c => c.id === selectedClass) && (
                <>
                  <div className="space-y-4 mb-4">
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
                      <span className="text-gray-600">Checked In</span>
                      <span className="text-2xl font-bold text-green-600">{successCount}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                      <span className="text-gray-600">Class Capacity</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {classes.find(c => c.id === selectedClass)?.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Attendance Rate</p>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all"
                        style={{
                          width: `${Math.min(
                            (successCount /
                              (classes.find(c => c.id === selectedClass)?.capacity || 1)) *
                            100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mt-2">
                      {(
                        (successCount /
                          (classes.find(c => c.id === selectedClass)?.capacity || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Recent Check-ins */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Check-ins</h3>

              {todayCheckIns.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No check-ins yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {todayCheckIns.map((checkIn, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg flex items-start gap-3 ${
                        checkIn.status === 'success'
                          ? 'bg-green-50'
                          : checkIn.status === 'already_checked'
                          ? 'bg-yellow-50'
                          : 'bg-red-50'
                      }`}
                    >
                      {checkIn.status === 'success' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      {checkIn.status === 'already_checked' && (
                        <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      )}
                      {checkIn.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {checkIn.athlete_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {checkIn.check_in_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
