'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { useDebounce } from '../../../hooks/useDebounce';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';
import EmptyState from '../../../components/EmptyState';
import LoadingSpinner from '../../../components/LoadingSpinner';

interface Product {
  id: string;
  retailerId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  category?: string;
  keywords: string[];
  inStock: boolean;
  isActive: boolean;
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [inStockFilter, setInStockFilter] = useState<boolean | undefined>(undefined);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Pagination
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    retailerId: '',
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    imageUrl: '',
    category: '',
    keywords: '',
    inStock: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [debouncedSearch, selectedCategory, inStockFilter, offset]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit, offset };
      if (debouncedSearch) params.query = debouncedSearch;
      if (selectedCategory) params.category = selectedCategory;
      if (inStockFilter !== undefined) params.inStock = inStockFilter;

      const data = await api.getProducts(params);
      setProducts(data.products || data);
      setTotal(data.meta?.total || data.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await api.getProductCategories();
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const productData = {
        retailerId: formData.retailerId,
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        currency: formData.currency,
        imageUrl: formData.imageUrl || undefined,
        category: formData.category || undefined,
        keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : [],
        inStock: formData.inStock,
      };

      await api.createProduct(productData);
      setShowCreateModal(false);
      resetForm();
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setFormLoading(true);
    setFormError(null);

    try {
      const productData = {
        retailerId: formData.retailerId,
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        currency: formData.currency,
        imageUrl: formData.imageUrl || undefined,
        category: formData.category || undefined,
        keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : [],
        inStock: formData.inStock,
      };

      await api.updateProduct(selectedProduct.id, productData);
      setShowEditModal(false);
      setSelectedProduct(null);
      resetForm();
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    setFormLoading(true);
    setFormError(null);

    try {
      await api.deleteProduct(selectedProduct.id);
      setShowDeleteModal(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setImportLoading(true);
    setFormError(null);
    setImportResults(null);

    try {
      const results = await api.importProductsCSV(csvFile);
      setImportResults(results);
      loadProducts();
      loadCategories();
    } catch (err: any) {
      setFormError(err.message || 'Failed to import CSV');
    } finally {
      setImportLoading(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      retailerId: product.retailerId,
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      currency: product.currency,
      imageUrl: product.imageUrl || '',
      category: product.category || '',
      keywords: product.keywords.join(', '),
      inStock: product.inStock,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      retailerId: '',
      name: '',
      description: '',
      price: '',
      currency: 'USD',
      imageUrl: '',
      category: '',
      keywords: '',
      inStock: true,
    });
    setFormError(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setInStockFilter(undefined);
    setOffset(0);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (loading && products.length === 0) {
    return <LoadingSpinner message="Loading products..." />;
  }

  if (error && products.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={loadProducts}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Products</h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          Manage your product catalog
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="mb-4 space-y-3 md:mb-6 md:space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:text-base"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-auto min-w-[140px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none md:min-w-[180px] md:text-base"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={inStockFilter === undefined ? '' : inStockFilter ? 'true' : 'false'}
            onChange={(e) => setInStockFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="w-auto min-w-[140px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none md:min-w-[180px] md:text-base"
          >
            <option value="">All Stock Status</option>
            <option value="true">In Stock</option>
            <option value="false">Out of Stock</option>
          </select>

          {(searchQuery || selectedCategory || inStockFilter !== undefined) && (
            <button
              onClick={clearFilters}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300 md:text-base"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openCreateModal}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 md:text-base"
            >
              + Add Product
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 md:text-base"
            >
              📤 Import CSV
            </button>
          </div>
        )}
      </div>

      {/* Products Grid/Table */}
      {products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products found"
          description={searchQuery || selectedCategory || inStockFilter !== undefined
            ? "Try adjusting your filters"
            : "Start by adding a product or importing from CSV"}
          action={isAdmin ? { label: "Add Product", onClick: openCreateModal } : undefined}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg bg-white shadow md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Stock
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200 text-xl">
                            📦
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">ID: {product.retailerId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.category || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {product.currency} {Number(product.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={product.inStock ? 'green' : 'red'}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(product)}
                          className="mr-2 text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {products.map((product) => (
              <div key={product.id} className="rounded-lg bg-white p-4 shadow">
                <div className="mb-3 flex items-start gap-3">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-200 text-2xl">
                      📦
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="mt-1 text-xs text-gray-500">ID: {product.retailerId}</div>
                    <div className="mt-2">
                      <Badge variant={product.inStock ? 'green' : 'red'} size="sm">
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{product.category || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">{product.currency} {Number(product.price).toFixed(2)}</span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex gap-2 border-t pt-3">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(product)}
                      className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="rounded-md bg-white px-3 py-1 text-sm text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="rounded-md bg-white px-3 py-1 text-sm text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedProduct(null);
          resetForm();
        }}
        title={showCreateModal ? 'Create Product' : 'Edit Product'}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedProduct(null);
                resetForm();
              }}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={showCreateModal ? handleCreateProduct : handleUpdateProduct}
              disabled={formLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form onSubmit={showCreateModal ? handleCreateProduct : handleUpdateProduct} className="space-y-4">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Retailer ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.retailerId}
              onChange={(e) => setFormData({ ...formData, retailerId: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-900">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="keyword1, keyword2, keyword3"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="inStock"
              checked={formData.inStock}
              onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="inStock" className="text-sm font-medium text-gray-900">
              In Stock
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProduct(null);
        }}
        title="Delete Product"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedProduct(null);
              }}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProduct}
              disabled={formLoading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {formLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {formError}
          </div>
        )}
        <p className="text-sm text-gray-700">
          Are you sure you want to delete <strong>{selectedProduct?.name}</strong>?
          This action will soft-delete the product (set isActive=false).
        </p>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setCsvFile(null);
          setImportResults(null);
          setFormError(null);
        }}
        title="Import Products from CSV"
        size="lg"
      >
        <form onSubmit={handleImportCSV} className="space-y-4">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          {!importResults && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  CSV should have columns: retailerId, name, description, price, currency, imageUrl, category, keywords (comma-separated), inStock (true/false)
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                    setFormError(null);
                  }}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || importLoading}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {importLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </>
          )}

          {importResults && (
            <div className="space-y-3">
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  ✓ Import Complete
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Imported: {importResults.imported || 0} products
                </p>
                {importResults.skipped > 0 && (
                  <p className="text-sm text-green-700">
                    Skipped: {importResults.skipped}
                  </p>
                )}
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-red-800">Errors:</h4>
                  <div className="max-h-60 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-3">
                    {importResults.errors.map((err: any, idx: number) => (
                      <div key={idx} className="mb-1 text-xs text-red-700">
                        Row {err.row}: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                    setImportResults(null);
                    setFormError(null);
                  }}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
