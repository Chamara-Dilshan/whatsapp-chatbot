'use client';

interface Column {
  header: string;
  accessor: string | ((row: any) => React.ReactNode);
  className?: string;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  className?: string;
}

export default function ResponsiveTable({ columns, data, className = '' }: ResponsiveTableProps) {
  const getCellValue = (row: any, column: Column) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden overflow-x-auto md:block ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((column, colIdx) => (
                  <td
                    key={colIdx}
                    className={`whitespace-nowrap px-6 py-4 text-sm text-gray-900 ${
                      column.className || ''
                    }`}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {data.map((row, rowIdx) => (
          <div key={rowIdx} className="rounded-lg bg-white p-4 shadow">
            {columns.map((column, colIdx) => (
              <div key={colIdx} className="flex justify-between border-b border-gray-100 py-2 last:border-0">
                <div className="text-xs font-medium text-gray-500">
                  {column.header}
                </div>
                <div className={`text-sm text-gray-900 ${column.className || ''}`}>
                  {getCellValue(row, column)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
