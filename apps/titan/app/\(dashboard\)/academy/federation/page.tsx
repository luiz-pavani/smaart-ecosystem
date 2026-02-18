"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  Building2,
  Users,
  Trophy,
  Calendar,
  CheckCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FederationData {
  academy: {
    id: string;
    nome: string;
    federacao_id: string;
    federacoes: { id: string; nome: string; sigla: string; cnpj: string };
  };
  athleteCount: number;
  upcomingEvents: any[];
  totalEvents: number;
}

export default function FederationIntegration() {
  const supabase = createClientComponentClient();
  const [data, setData] = useState<FederationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    fetchFederationData();
  }, []);

  const fetchFederationData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/academy/federation?type=${selectedTab}`
      );

      if (!response.ok) throw new Error("Failed to fetch federation data");

      const federationData = await response.json();
      setData(federationData);
    } catch (error) {
      console.error("Error fetching federation data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFederationData();
  }, [selectedTab]);

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
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
              <Building2 className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Federation Integration
              </h1>
              <p className="text-gray-600">
                Manage athlete registrations & federation events
              </p>
            </div>
          </div>
        </div>

        {/* Federation Info Card */}
        {data?.academy && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8 border-l-4 border-blue-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-gray-600 text-sm mb-1">Academy</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  {data.academy.nome}
                </h2>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">Federation</p>
                <h2 className="text-2xl font-bold text-blue-600">
                  {data.academy.federacoes?.nome}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {data.academy.federacoes?.sigla}
                </p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-1">Active Athletes</p>
                <h2 className="text-2xl font-bold text-green-600">
                  {data.athleteCount}
                </h2>
              </div>
            </div>
          </div>
        )}

        {/* 12-item Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Athletes in Academy</p>
              <Users className="text-blue-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {data?.athleteCount || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Upcoming Events</p>
              <Trophy className="text-green-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {data?.totalEvents || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Events This Month</p>
              <Calendar className="text-purple-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {data?.upcomingEvents?.filter((e) => {
                const eventDate = new Date(e.data_evento);
                const now = new Date();
                return (
                  eventDate.getMonth() === now.getMonth() &&
                  eventDate.getFullYear() === now.getFullYear()
                );
              }).length || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-amber-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Registrations Available</p>
              <Zap className="text-amber-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {Math.max(0, (data?.athleteCount || 0) * (data?.totalEvents || 1))}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                selectedTab === "overview"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab("events")}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                selectedTab === "events"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setSelectedTab("athletes")}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                selectedTab === "athletes"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Athletes
            </button>
          </div>

          <div className="p-8 min-h-96">
            {selectedTab === "overview" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Federation Overview
                </h2>
                <div className="space-y-4">
                  {data?.upcomingEvents?.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {event.nome}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(event.data_evento).toLocaleDateString(
                              "pt-BR"
                            )}{" "}
                            • {event.local || "Location TBD"}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {event.modalidade || "Mixed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === "events" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Federation Events
                </h2>
                <div className="space-y-4">
                  {data?.events?.map((event) => (
                    <div
                      key={event.id}
                      className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {event.nome}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">
                          📅{" "}
                          {new Date(event.data_evento).toLocaleDateString(
                            "pt-BR"
                          )}{" "}
                          • 📍 {event.local || "Location TBD"}
                        </p>
                        <p className="text-sm text-blue-600 mt-2">
                          Registered: {event.academyAthletes} of{" "}
                          {data.athleteCount} athletes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {event.academyAthletes}
                        </p>
                        <p className="text-xs text-gray-500">athletes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === "athletes" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Academy Athletes for Registration
                </h2>
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <p className="text-gray-700">
                    These athletes are eligible to register for federation
                    events. Select an athlete and event to register them.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data?.athletes?.slice(0, 10).map((athlete: any) => (
                    <div
                      key={athlete.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {athlete.nome}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {athlete.graduacao} • {athlete.modality}
                          </p>
                        </div>
                        <CheckCircle className="text-green-500" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Federation Integration Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                One-Click Registration
              </h3>
              <p className="text-gray-700">
                Quickly register your academy athletes in federation events with
                pre-filled athlete data
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Event Discovery
              </h3>
              <p className="text-gray-700">
                Access all upcoming federation and confederation events relevant
                to your academy
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Performance Tracking
              </h3>
              <p className="text-gray-700">
                Monitor which athletes are registered and track participation
                across events
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
