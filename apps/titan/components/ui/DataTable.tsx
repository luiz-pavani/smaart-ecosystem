import { ReactNode } from 'react'

interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T, index: number) => string
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({ 
  columns, 
  data, 
  keyExtractor, 
  emptyMessage = 'Nenhum dado encontrado',
  className = ''
}: DataTableProps<T>) {
  return (
    <div className={`bg-white/5 backdrop-blur border border-white/10 rounded-xl overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            {columns.map((column, index) => (
              <th 
                key={index}
                className={`px-6 py-3 text-left text-sm font-semibold text-white ${column.headerClassName || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr 
                key={keyExtractor(row, rowIndex)}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={colIndex}
                    className={`px-6 py-4 text-gray-300 ${column.className || ''}`}
                  >
                    {typeof column.accessor === 'function' 
                      ? column.accessor(row)
                      : String(row[column.accessor as keyof T] ?? '-')
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
