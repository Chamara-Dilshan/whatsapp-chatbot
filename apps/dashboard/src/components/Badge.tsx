'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'yellow' | 'green' | 'red' | 'gray' | 'orange';
  size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'gray', size = 'md' }: BadgeProps) {
  const variantClasses = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs md:text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
}
