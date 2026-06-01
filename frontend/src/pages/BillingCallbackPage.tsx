import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';

type Status = 'loading' | 'success' | 'pending' | 'failed';

export default function BillingCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Pesapal redirects back with OrderTrackingId and OrderMerchantReference
    const orderTrackingId = searchParams.get('OrderTrackingId');

    if (!orderTrackingId) {
      setStatus('failed');
      setMessage('No payment reference found in the URL.');
      return;
    }

    // Poll billing info to reflect the latest status
    api
      .get('/billing/my')
      .then(({ data }) => {
        const history: { status: string; trackingId: string | null }[] =
          data.history ?? [];
        const match = history.find((s) => s.trackingId === orderTrackingId);
        const payStatus = match?.status ?? 'PENDING';

        if (payStatus === 'COMPLETED') {
          setStatus('success');
          setMessage('Your subscription is now active. Thank you!');
        } else if (payStatus === 'FAILED' || payStatus === 'INVALID') {
          setStatus('failed');
          setMessage('Payment was not completed. Please try again.');
        } else {
          setStatus('pending');
          setMessage('Payment is being processed. Your plan will activate shortly.');
        }
      })
      .catch(() => {
        // If unauthenticated, the IPN may have already updated the DB.
        // Show a generic pending message.
        setStatus('pending');
        setMessage('Payment received. Please log in to verify your subscription status.');
      });
  }, [searchParams]);

  const icons: Record<Status, React.ReactNode> = {
    loading: <Clock className="w-16 h-16 text-amber-400 animate-pulse" />,
    success: <CheckCircle className="w-16 h-16 text-green-500" />,
    pending: <Clock className="w-16 h-16 text-amber-400" />,
    failed: <XCircle className="w-16 h-16 text-red-500" />,
  };

  const titles: Record<Status, string> = {
    loading: 'Verifying payment…',
    success: 'Payment Successful!',
    pending: 'Payment Pending',
    failed: 'Payment Failed',
  };

  const bgColors: Record<Status, string> = {
    loading: 'bg-amber-50 dark:bg-amber-900/10',
    success: 'bg-green-50 dark:bg-green-900/10',
    pending: 'bg-amber-50 dark:bg-amber-900/10',
    failed: 'bg-red-50 dark:bg-red-900/10',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className={`rounded-2xl shadow-lg p-10 max-w-md w-full text-center ${bgColors[status]}`}>
        <div className="flex justify-center mb-6">{icons[status]}</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {titles[status]}
        </h1>
        {message && (
          <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>
        )}
        <div className="flex flex-col gap-3">
          <Link
            to="/billing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-lime-500 hover:bg-lime-600 text-white font-semibold transition-colors"
          >
            View Billing Dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
