'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Badge from '../../../../components/Badge';
import LoadingSpinner from '../../../../components/LoadingSpinner';

// ── Types ─────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

interface Shipment {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  latestStatusText: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shipment: Shipment | null;
}

const STATUS_VARIANTS: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'orange'> = {
  pending: 'yellow',
  processing: 'blue',
  shipped: 'blue',
  delivered: 'green',
  canceled: 'gray',
  refunded: 'orange',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Shipment form
  const [shipForm, setShipForm] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: '',
  });

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Order not found');
      const json = await res.json();
      setOrder(json.data);
      if (json.data.shipment) {
        setShipForm({
          carrier: json.data.shipment.carrier || '',
          trackingNumber: json.data.shipment.trackingNumber || '',
          trackingUrl: json.data.shipment.trackingUrl || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const handleAction = async (action: string, body?: object) => {
    setActionLoading(action);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error('Action failed');
      await fetchOrder();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error ?? 'Order not found'}</div>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">
          ← Back to orders
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-2 text-sm text-blue-600 hover:underline">
            ← Orders
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-gray-900">{order.orderNumber}</h1>
            <Badge variant={STATUS_VARIANTS[order.status] ?? 'gray'}>
              {order.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Created {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {(order.status === 'pending' || order.status === 'processing') && (
            <>
              <button
                onClick={() => handleAction('mark-shipped', shipForm)}
                disabled={!!actionLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'mark-shipped' ? <LoadingSpinner size="sm" /> : 'Mark Shipped'}
              </button>
              <button
                onClick={() => { if (confirm('Cancel this order?')) handleAction('cancel'); }}
                disabled={!!actionLoading}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
          {order.status === 'shipped' && (
            <button
              onClick={() => handleAction('mark-delivered')}
              disabled={!!actionLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'mark-delivered' ? <LoadingSpinner size="sm" /> : 'Mark Delivered'}
            </button>
          )}
          {(order.status === 'delivered' || order.status === 'canceled') && (
            <button
              onClick={() => { if (confirm('Refund this order?')) handleAction('refund'); }}
              disabled={!!actionLoading}
              className="rounded-lg border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              Refund
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Order details */}
        <div className="space-y-6 lg:col-span-2">

          {/* Customer info */}
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Customer</h2>
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{order.customerName || '—'}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{order.customerPhone}</span></div>
            </div>
          </div>

          {/* Order items */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-5 py-3">
              <h2 className="text-base font-semibold text-gray-900">Items</h2>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-5 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                  <th className="px-5 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{item.title}</td>
                    <td className="px-5 py-3 text-center text-sm text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-sm text-gray-600">
                      {order.currency} {Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">
                      {order.currency} {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs font-medium text-gray-500">Subtotal</td>
                  <td className="px-5 py-2 text-right text-sm text-gray-700">{order.currency} {Number(order.subtotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs font-medium text-gray-500">Shipping</td>
                  <td className="px-5 py-2 text-right text-sm text-gray-700">{order.currency} {Number(order.shippingFee).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-right text-sm font-bold text-gray-900">Total</td>
                  <td className="px-5 py-2 text-right text-sm font-bold text-gray-900">{order.currency} {Number(order.total).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-base font-semibold text-gray-900">Notes</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right column: Shipment */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Shipment</h2>

            {order.shipment?.shippedAt && (
              <div className="mb-4 space-y-1 text-sm">
                <div><span className="text-gray-500">Shipped:</span> {new Date(order.shipment.shippedAt).toLocaleDateString()}</div>
                {order.shipment.deliveredAt && (
                  <div><span className="text-gray-500">Delivered:</span> {new Date(order.shipment.deliveredAt).toLocaleDateString()}</div>
                )}
                {order.shipment.latestStatusText && (
                  <div><span className="text-gray-500">Status:</span> {order.shipment.latestStatusText}</div>
                )}
              </div>
            )}

            {/* Shipment form for mark-shipped */}
            {(order.status === 'pending' || order.status === 'processing' || order.status === 'shipped') && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Carrier</label>
                  <input
                    type="text"
                    value={shipForm.carrier}
                    onChange={(e) => setShipForm({ ...shipForm, carrier: e.target.value })}
                    placeholder="DHL, FedEx, etc."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tracking Number</label>
                  <input
                    type="text"
                    value={shipForm.trackingNumber}
                    onChange={(e) => setShipForm({ ...shipForm, trackingNumber: e.target.value })}
                    placeholder="1Z999AA10123456784"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Tracking URL</label>
                  <input
                    type="url"
                    value={shipForm.trackingUrl}
                    onChange={(e) => setShipForm({ ...shipForm, trackingUrl: e.target.value })}
                    placeholder="https://track.example.com/..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {order.status !== 'shipped' && (
                  <p className="text-xs text-gray-400">
                    Fill in shipping info above, then click "Mark Shipped" to update the order.
                  </p>
                )}
                {order.status === 'shipped' && order.shipment && (
                  <button
                    onClick={() => handleAction('mark-shipped', shipForm)}
                    disabled={!!actionLoading}
                    className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Update Tracking Info
                  </button>
                )}
              </div>
            )}

            {order.shipment?.trackingUrl && (
              <a
                href={order.shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-center text-sm text-blue-600 hover:underline"
              >
                Track Shipment →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
