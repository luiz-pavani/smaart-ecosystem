"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { CheckCircle2, X, Loader2, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface Event {
  id: string;
  nome: string;
  data_evento: string;
  local: string;
  modalidade: string;
  descricao?: string;
}

interface Athlete {
  id: string;
  nome: string;
  graduacao: string;
  modality: string;
}

interface Registration {
  eventId: string;
  athleteId: string;
  success: boolean;
  message: string;
}

export default function EventRegistration() {
  const supabase = createClientComponentClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registrationResults, setRegistrationResults] = useState<
    Registration[]
  >([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch events and athletes in parallel
      const [eventsRes, athletesRes] = await Promise.all([
        fetch("/api/academy/federation?type=events"),
        fetch("/api/academy/federation?type=athletes"),
      ]);

      const eventsData = await eventsRes.json();
      const athletesData = await athletesRes.json();

      setEvents(eventsData.events || []);
      setAthletes(athletesData.athletes || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAthlete = (athleteId: string) => {
    const newSet = new Set(selectedAthletes);
    if (newSet.has(athleteId)) {
      newSet.delete(athleteId);
    } else {
      newSet.add(athleteId);
    }
    setSelectedAthletes(newSet);
  };

  const toggleAllAthletes = () => {
    if (selectedAthletes.size === athletes.length) {
      setSelectedAthletes(new Set());
    } else {
      setSelectedAthletes(new Set(athletes.map((a) => a.id)));
    }
  };

  const handleRegisterAthletes = async () => {
    if (!selectedEvent || selectedAthletes.size === 0) return;

    try {
      setRegistering(true);
      const results: Registration[] = [];

      // Register each athlete one by one
      for (const athleteId of selectedAthletes) {
        try {
          const response = await fetch(
            `/api/academy/federation?type=register-event&event_id=${selectedEvent.id}&athlete_id=${athleteId}`,
            { method: "POST" }
          );

          const data = await response.json();

          results.push({
            eventId: selectedEvent.id,
            athleteId,
            success: response.ok,
            message: response.ok
              ? "Successfully registered"
              : data.error || "Registration failed",
          });
        } catch (error) {
          results.push({
            eventId: selectedEvent.id,
            athleteId,
            success: false,
            message:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      setRegistrationResults(results);
      setSelectedAthletes(new Set());
      setSelectedEvent(null);

      // Refresh data after 2 seconds
      setTimeout(() => {
        fetchData();
        setRegistrationResults([]);
      }, 2000);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-600 to-green-700 rounded-lg">
              <Trophy className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Event Registration
              </h1>
              <p className="text-gray-600">
                Register your academy athletes in federation events
              </p>
            </div>
          </div>
        </div>

        {/* Registration Results Modal */}
        {registrationResults.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Registration Complete
              </h2>
              <div className="space-y-2 mb-6">
                {registrationResults.map((result, idx) => {
                  const athlete = athletes.find((a) => a.id === result.athleteId);
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg flex items-center gap-2 ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                    >
                      {result.success ? (
                        <CheckCircle2 size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{athlete?.nome}</p>
                        <p className="text-sm">{result.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setRegistrationResults([])}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Available Events
              </h2>
              <div className="space-y-4">
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-6 border-2 rounded-lg cursor-pointer transition ${
                        selectedEvent?.id === event.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">
                            {event.nome}
                          </h3>
                          <p className="text-sm text-gray-600 mt-2">
                            📅{" "}
                            {new Date(event.data_evento).toLocaleDateString(
                              "pt-BR"
                            )}{" "}
                            at{" "}
                            {new Date(event.data_evento).toLocaleTimeString(
                              "pt-BR",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            📍 {event.local}
                          </p>
                          <p className="text-sm text-gray-600">
                            🥋 {event.modalidade}
                          </p>
                          {event.descricao && (
                            <p className="text-sm text-gray-700 mt-3">
                              {event.descricao}
                            </p>
                          )}
                        </div>
                        {selectedEvent?.id === event.id && (
                          <div className="ml-4 pt-2">
                            <CheckCircle2 className="text-blue-600" size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No events available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Athletes Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Select Athletes
              </h2>

              {selectedEvent ? (
                <>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium">
                      {selectedEvent.nome}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {selectedAthletes.size} athlete(s) selected
                    </p>
                  </div>

                  <div className="mb-4">
                    <button
                      onClick={toggleAllAthletes}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedAthletes.size === athletes.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
                    {athletes.map((athlete) => (
                      <label
                        key={athlete.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAthletes.has(athlete.id)}
                          onChange={() => toggleAthlete(athlete.id)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {athlete.nome}
                          </p>
                          <p className="text-xs text-gray-600">
                            {athlete.graduacao} • {athlete.modality}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleRegisterAthletes}
                    disabled={
                      selectedAthletes.size === 0 || registering
                    }
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                  >
                    {registering ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        Register {selectedAthletes.size > 0 ? selectedAthletes.size : ""} Athlete
                        {selectedAthletes.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users size={40} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Select an event to register athletes</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How to Register Athletes
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Select an event from the available events list</li>
            <li>Choose one or more athletes to register</li>
            <li>Click "Register" to complete the registration</li>
            <li>
              Athletes will receive confirmation of their registration via
              email
            </li>
            <li>Check the federation website for final event details</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
