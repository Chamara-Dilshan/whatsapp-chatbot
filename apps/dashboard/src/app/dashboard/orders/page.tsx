'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Badge from '../../../components/Badge';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmptyState from '../../../components/EmptyState';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Types ─────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'orange'> = {
  pending: 'yellow',
  processing: 'blue',
  shipped: 'blue',
  delivered: 'green',
  canceled: 'gray',
  refunded: 'orange',
};

const STATUS_OPTIONS = ['', 'pending', 'processing', 'shipped', 'delivered', 'canceled', 'refunded'];

// ── Component ─────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('q', search);
      params.set('limit', String(LIMIT));
      params.set('offset', String(page * LIMIT));

      const res = await fetch(`${API_BASE}/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load orders');
      const json = await res.json();
      setOrders(json.data.orders);
      setTotal(json.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleAction = async (orderId: string, action: string) => {
    setActionLoading(orderId + action);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Action failed');
      await fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search by order #, name, phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders found"
          description="Orders will appear here once they are created."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-mono text-sm font-medium text-blue-600 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.customerName || '—'}</div>
                      <div className="text-xs text-gray-400">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANTS[order.status] ?? 'gray'} size="sm">
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.items.length} item(s)</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {order.currency} {Number(order.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {order.status === 'pending' || order.status === 'processing' ? (
                          <button
                            onClick={() => handleAction(order.id, 'mark-shipped')}
                            disabled={!!actionLoading}
                            className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            Ship
                          </button>
                        ) : order.status === 'shipped' ? (
                          <button
                            onClick={() => handleAction(order.id, 'mark-delivered')}
                            disabled={!!actionLoading}
                            className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            Deliver
                          </button>
                        ) : null}
                        {(order.status === 'pending' || order.status === 'processing') && (
                          <button
                            onClick={() => handleAction(order.id, 'cancel')}
                            disabled={!!actionLoading}
                            className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="font-mono text-sm font-bold text-blue-600"
                  >
                    {order.orderNumber}
                  </Link>
                  <Badge variant={STATUS_VARIANTS[order.status] ?? 'gray'} size="sm">
                    {order.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-700">{order.customerName || order.customerPhone}</div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-500">{order.items.length} item(s)</span>
                  <span className="font-semibold text-gray-900">
                    {order.currency} {Number(order.total).toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  {(order.status === 'pending' || order.status === 'processing') && (
                    <button
                      onClick={() => handleAction(order.id, 'mark-shipped')}
                      className="flex-1 rounded bg-blue-600 py-1.5 text-xs font-medium text-white"
                    >
                      Mark Shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => handleAction(order.id, 'mark-delivered')}
                      className="flex-1 rounded bg-green-600 py-1.5 text-xs font-medium text-white"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
