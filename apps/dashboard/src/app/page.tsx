export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl">💬</div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          WhatsApp Bot Dashboard
        </h1>
        <p className="mb-8 text-gray-600">
          Multi-tenant WhatsApp Business Support Bot SaaS
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600 transition-colors"
          >
            Login
          </a>
        </div>
        <p className="mt-6 text-sm text-gray-400">Phase 1 - Foundation Setup Complete</p>
      </div>
    </div>
  );
}
