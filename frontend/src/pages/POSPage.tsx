import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { enqueueOfflineSale } from '../lib/offlineQueue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface CartLine {
  productId: number;
  productUnitId: number;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [barcode, setBarcode] = useState('');
  const [saleType, setSaleType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CREDIT'>('CASH');
  const [receipt, setReceipt] = useState<any>(null);
  const [offlineBanner, setOfflineBanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [offlineSaleMsg, setOfflineSaleMsg] = useState('');
  const [failedSalesAlert, setFailedSalesAlert] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Track online status and auto-flush offline queue on reconnect
  const { isOnline, pendingCount, failedCount } = useOnlineStatus({
    onReconnect: (synced) => {
      if (synced > 0) setOfflineBanner(false);
    },
    onFailedSales: (count) => {
      setFailedSalesAlert(
        `${count} sale${count === 1 ? '' : 's'} could not be synced and have been saved for manager review. Check "Failed Sales" in Settings.`
      );
    },
  });

  // Keep offlineBanner in sync with isOnline
  useEffect(() => {
    if (!isOnline) setOfflineBanner(true);
  }, [isOnline]);

  const { data: customersPage } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers?limit=500').then((r) => r.data),
  });
  const customers: any[] = customersPage?.data ?? [];

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/stock/locations').then((r) => r.data),
  });

  const defaultLocationId = locations?.[0]?.id ?? 1;

  const createSaleMutation = useMutation({
    mutationFn: (payload: any) => api.post('/sales', payload).then((r) => r.data),
    onSuccess: (data) => {
      setReceipt(data);
      setCart([]);
      qc.invalidateQueries({ queryKey: ['daily-sales'] });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 429) {
        setScanError('Too many requests — please wait a moment before completing this sale.');
      } else if (status === 422 || status === 400) {
        setScanError(msg ?? 'Sale could not be completed. Check item quantities and try again.');
      } else {
        setScanError(msg ?? 'Failed to process sale. Please try again.');
      }
    },
  });

  const scanBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const { data: product } = await api.get(`/products/barcode/${barcode.trim()}`);
      const unit = product.units?.[0];
      if (!unit) return;
      addToCart({
        productId: product.id,
        productUnitId: unit.id,
        productName: product.name,
        unitName: unit.unitName,
        quantity: 1,
        unitPrice: parseFloat(saleType === 'WHOLESALE' ? unit.sellingPriceWholesale : unit.sellingPriceRetail),
        discount: 0,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setScanError('Too many requests — please slow down and try again in a moment.');
      } else if (status === 404) {
        setScanError(`No product found for "${barcode.trim()}". Check the barcode or SKU.`);
      } else {
        setScanError('Could not look up product. Please check your connection and try again.');
      }
    }
    setBarcode('');
    barcodeRef.current?.focus();
  };

  const addToCart = (line: CartLine) => {
    setCart((prev) => {
      const existing = prev.findIndex(
        (l) => l.productId === line.productId && l.productUnitId === line.productUnitId
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].quantity += line.quantity;
        return updated;
      }
      return [...prev, line];
    });
  };

  const updateQty = (index: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
    } else {
      setCart((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: qty } : l)));
    }
  };

  const grandTotal = cart.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100), 0);

  const checkout = async () => {
    if (!cart.length) return;
    const salePayload = {
      saleType,
      customerId: customerId ?? undefined,
      locationId: defaultLocationId,
      notes: '',
      lines: cart.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: parseFloat(String(l.unitPrice)),
        discount: l.discount,
      })),
      payments: [{ paymentMethod, amount: grandTotal, paymentReference: '' }],
    };
    if (!navigator.onLine) {
      await enqueueOfflineSale(salePayload);
      setOfflineBanner(true);
      setCart([]);
      setOfflineSaleMsg('You are offline — sale has been saved locally and will sync automatically when your connection is restored.');
      return;
    }
    createSaleMutation.mutate(salePayload);
  };

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  if (receipt) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">Sale Complete</h2>
          <p className="text-gray-500 mt-1">Receipt #{receipt.saleNumber}</p>
          <p className="text-3xl font-bold text-blue-700 my-4">
            UGX {Number(receipt.grandTotal).toLocaleString()}
          </p>
          <button
            onClick={() => setReceipt(null)}
            className="w-full bg-blue-700 text-white rounded-lg py-2 font-semibold hover:bg-blue-800 mt-4"
          >
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {failedSalesAlert && (
        <div className="bg-red-600 text-white text-sm text-center py-2 font-medium flex items-center justify-center gap-3">
          <span>⚠️ {failedSalesAlert}</span>
          <button
            onClick={() => setFailedSalesAlert(null)}
            className="ml-2 text-white underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}
      {offlineBanner && (
        <div className="bg-yellow-500 text-white text-sm text-center py-1.5 font-medium">
          OFFLINE MODE — Sales are queued locally and will sync when connection is restored.
          {pendingCount > 0 && <span className="ml-2 bg-white text-yellow-700 rounded-full px-2 py-0.5 text-xs font-bold">{pendingCount} pending</span>}
          {failedCount > 0 && <span className="ml-2 bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-bold">{failedCount} failed</span>}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      {/* Cart panel */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex-1">POS</h2>
          <select
            value={saleType}
            onChange={(e) => setSaleType(e.target.value as any)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
          </select>
        </div>

        <div className="flex gap-2 mb-1">
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(e) => { setBarcode(e.target.value); setScanError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && scanBarcode()}
            placeholder="Scan barcode or type SKU... (Enter)"
            className={`flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              scanError ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <button
            onClick={scanBarcode}
            className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        {scanError && (
          <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
            <span>⚠</span> {scanError}
          </p>
        )}
        {offlineSaleMsg && (
          <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-800 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
            <span>📶</span> {offlineSaleMsg}
            <button onClick={() => setOfflineSaleMsg('')} className="ml-auto text-amber-600 hover:text-amber-900">✕</button>
          </div>
        )}

        {/* Cart table */}
        <div className="flex-1 bg-white rounded-xl shadow overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">
                    <p className="font-medium">{line.productName}</p>
                    <p className="text-xs text-gray-400">{line.unitName}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateQty(i, Number(e.target.value))}
                      className="w-16 border rounded text-center text-sm py-1"
                      min={1}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">{line.unitPrice.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {(line.quantity * line.unitPrice).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => updateQty(i, 0)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Cart is empty. Scan a barcode to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checkout sidebar */}
      <div className="w-80 bg-white shadow-lg p-6 flex flex-col">
        <h3 className="font-semibold text-gray-700 mb-4">Checkout</h3>

        <div className="mb-3">
          <label className="text-xs text-gray-500 mb-1 block">Customer (optional)</label>
          <select
            value={customerId ?? ''}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Walk-in Customer</option>
            {customers?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="CASH">Cash</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="BANK">Bank</option>
            <option value="CREDIT">Credit</option>
          </select>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Items</span><span>{cart.length}</span>
          </div>
          <div className="flex justify-between font-bold text-xl text-gray-800 mb-4">
            <span>Total</span>
            <span>UGX {grandTotal.toLocaleString()}</span>
          </div>
          <button
            onClick={checkout}
            disabled={!cart.length || createSaleMutation.isPending}
            className="w-full bg-green-600 text-white font-bold rounded-xl py-3 hover:bg-green-700 disabled:opacity-50 transition text-lg"
          >
            {createSaleMutation.isPending ? 'Processing...' : '💳 Checkout'}
          </button>
          {createSaleMutation.isError && (
            <p className="text-red-500 text-xs mt-2 text-center">Sale failed. Check stock levels.</p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
