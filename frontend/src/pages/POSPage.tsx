import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { enqueueOfflineSale, flushOfflineQueue } from '../lib/offlineQueue';

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
  const barcodeRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // Flush queued offline sales when connection is restored
  useEffect(() => {
    const handleOnline = async () => {
      const token = (useAuthStore.getState() as any).accessToken;
      if (!token) return;
      const synced = await flushOfflineQueue(token);
      if (synced > 0) {
        qc.invalidateQueries({ queryKey: ['daily-sales'] });
        setOfflineBanner(false);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [qc]);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

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
    } catch {
      alert('Product not found for this barcode');
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
      alert('You are offline — sale queued and will sync when connection is restored.');
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
      {offlineBanner && (
        <div className="bg-yellow-500 text-white text-sm text-center py-1.5 font-medium">
          OFFLINE MODE — Sales are queued locally and will sync when connection is restored.
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

        <div className="flex gap-2 mb-4">
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && scanBarcode()}
            placeholder="Scan barcode or type SKU... (Enter)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={scanBarcode}
            className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700"
          >
            Add
          </button>
        </div>

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
