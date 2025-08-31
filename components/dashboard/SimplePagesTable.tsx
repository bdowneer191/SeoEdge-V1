import React from 'react';
import Link from 'next/link';

interface Page {
  page: string;
  [key: string]: any;
}

interface Props {
  title: string;
  pages: Page[];
  columns: {
    header: string;
    accessor: string;
    format?: (value: any) => string;
  }[];
}

const SimplePagesTable: React.FC<Props> = ({ title, pages, columns }) => {
  if (!pages || pages.length === 0) {
    return (
        <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
            <p className="text-gray-400">No data available.</p>
        </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Page</th>
              {columns.map(col => (
                <th key={col.accessor} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {pages.map(page => (
              <tr key={page.page}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <Link href={page.page} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {page.page}
                    </Link>
                </td>
                {columns.map(col => (
                    <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {col.format ? col.format(page[col.accessor]) : page[col.accessor]}
                    </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimplePagesTable;
