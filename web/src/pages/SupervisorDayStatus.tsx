import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PromoterStatus {
  id: string;
  name: string;
  state?: string;
  storesTotal: number;
  storesVisited: number;
  lastCheckIn?: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface CheckInReview {
  id: string;
  visitId: string;
  gpsStatus: string;
  promoter: { id: string; name: string };
  store: { id: string; name: string; address: string };
  checkInAt: string;
  createdAt: string;
}

async function fetchDayStatus(date: string): Promise<{ promoters: PromoterStatus[] }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/supervisors/day-status?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Falha ao carregar status');
  return response.json();
}

async function fetchCheckInReviews(): Promise<{ reviews: CheckInReview[] }> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/supervisors/check-in-reviews', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Falha ao carregar revisões');
  return response.json();
}

async function reviewCheckIn(data: { reviewId: string; approved: boolean; note?: string }) {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/supervisors/review-check-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Falha ao revisar check-in');
  return response.json();
}

export default function SupervisorDayStatus() {
  const [selectedDate, setSelectedDate] = useState(() => 
    new Date().toISOString().split('T')[0]
  );
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: loadingStatus } = useQuery({
    queryKey: ['day-status', selectedDate],
    queryFn: () => fetchDayStatus(selectedDate),
    refetchInterval: 30000,
  });

  const { data: reviewsData, isLoading: loadingReviews } = useQuery({
    queryKey: ['check-in-reviews'],
    queryFn: fetchCheckInReviews,
    refetchInterval: 60000,
  });

  const reviewMutation = useMutation({
    mutationFn: reviewCheckIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-in-reviews'] });
    },
  });

  const promoters = statusData?.promoters || [];
  const reviews = reviewsData?.reviews || [];

  const notStarted = promoters.filter(p => p.status === 'not_started');
  const inProgress = promoters.filter(p => p.status === 'in_progress');
  const completed = promoters.filter(p => p.status === 'completed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Não iniciou</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Em andamento</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Concluído</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Status do Dia</h1>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              {notStarted.length} não iniciaram
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              {inProgress.length} em andamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              {completed.length} concluídos
            </span>
          </div>
        </div>
      </div>

      {/* Check-ins para revisão (sem GPS) */}
      {reviews.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">
            ⚠️ Check-ins para Revisão ({reviews.length})
          </h2>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-4 rounded-lg border border-yellow-300 flex items-center justify-between">
                <div>
                  <p className="font-medium">{review.promoter.name}</p>
                  <p className="text-sm text-gray-600">{review.store.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.checkInAt).toLocaleString()} • GPS: {review.gpsStatus}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewMutation.mutate({ reviewId: review.id, approved: true })}
                    disabled={reviewMutation.isPending}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ reviewId: review.id, approved: false })}
                    disabled={reviewMutation.isPending}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    ✕ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de promotores */}
      {loadingStatus ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#411A59] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Promotor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Lojas</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Último Check-in</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoters.map((promoter) => (
                <tr 
                  key={promoter.id}
                  className={`hover:bg-gray-50 ${
                    promoter.status === 'not_started' ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{promoter.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {promoter.state || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${
                      promoter.storesVisited === promoter.storesTotal 
                        ? 'text-green-600' 
                        : promoter.storesVisited > 0 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                    }`}>
                      {promoter.storesVisited}/{promoter.storesTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {promoter.lastCheckIn 
                      ? new Date(promoter.lastCheckIn).toLocaleTimeString() 
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(promoter.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
