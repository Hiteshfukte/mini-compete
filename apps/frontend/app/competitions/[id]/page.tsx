'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Competition {
  id: string;
  title: string;
  description: string;
  tags: string[];
  capacity: number;
  startDate: string;
  regDeadline: string;
  organizer: {
    name: string;
    email: string;
  };
  _count?: {
    registrations: number;
  };
}

export default function CompetitionDetails() {
  const router = useRouter();
  const params = useParams();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchCompetition();
  }, [params.id]);

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`http://localhost:3001/competitions/${params.id}`);
      const data = await response.json();
      setCompetition(data);
    } catch (error) {
      console.error('Failed to fetch competition:', error);
      setError('Failed to load competition details');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setRegistering(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/competitions/${params.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess('Successfully registered for the competition!');
      fetchCompetition(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Competition not found</h2>
          <Link href="/competitions" className="text-blue-600 hover:text-blue-700">
            Back to competitions
          </Link>
        </div>
      </div>
    );
  }

  const isFull = (competition._count?.registrations || 0) >= competition.capacity;
  const isDeadlinePassed = new Date(competition.regDeadline) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CompeteMini
            </span>
          </Link>

          <Link href="/competitions" className="text-gray-700 hover:text-blue-600 font-medium transition">
            ← Back to Competitions
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Array.isArray(competition?.tags) && competition.tags.length > 0 ? (
                competition.tags.map((tag, index) => (
                <span 
                key={index}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                    {tag}
                </span>
                ))
            ) : (
            <span className="text-gray-500 italic">No tags available</span>
            )}
          </div>


          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {competition.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-6 mb-8 text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{competition?.organizer?.name || 'Unknown Organizer'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{competition._count?.registrations || 0} / {competition.capacity} registered</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Competition</h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              {competition.description}
            </p>
          </div>

          {/* Important Dates */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Registration Deadline</h3>
              <p className="text-2xl font-bold text-blue-600">{formatDate(competition.regDeadline)}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">Competition Starts</h3>
              <p className="text-2xl font-bold text-purple-600">{formatDate(competition.startDate)}</p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {/* Register Button */}
          {user ? (
            <button
              onClick={handleRegister}
              disabled={registering || isFull || isDeadlinePassed}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {registering ? 'Registering...' : isFull ? 'Competition Full' : isDeadlinePassed ? 'Registration Closed' : 'Register Now'}
            </button>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">You need to be logged in to register</p>
              <Link
                href="/login"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300"
              >
                Login to Register
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}