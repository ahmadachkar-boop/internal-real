import React from 'react';
import { Printer } from 'lucide-react';

/**
 * HomeTab component - Displays event overview with statistics and member lists
 * @param {Object} ndr - The NDR object
 * @param {Array} directors - Array of director members
 * @param {Array} males - Array of male members
 * @param {Array} females - Array of female members
 * @param {Function} onPrintAgreements - Callback to print agreements
 * @param {Function} onPrintPage - Callback to print current page
 */
const HomeTab = ({ ndr, directors, males, females, onPrintAgreements, onPrintPage }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h3 className="text-xl font-bold">Event Details</h3>
        <div className="flex gap-2">
          <button
            onClick={onPrintAgreements}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <Printer size={18} />
            Print Agreements
          </button>
          <button
            onClick={onPrintPage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Printer size={18} />
            Print This Page
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-gray-600">Cars Available</p>
          <p className="text-2xl font-bold text-blue-600">{ndr.availableCars || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <p className="text-sm text-gray-600">Completed Riders</p>
          <p className="text-2xl font-bold text-green-600">{ndr.completedRiders || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <p className="text-sm text-gray-600">Cancelled Riders</p>
          <p className="text-2xl font-bold text-red-600">{ndr.cancelledRiders || 0}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded">
          <p className="text-sm text-gray-600">Terminated Riders</p>
          <p className="text-2xl font-bold text-orange-600">{ndr.terminatedRiders || 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <p className="text-sm text-gray-600">Total Members</p>
          <p className="text-2xl font-bold text-purple-600">{directors.length + males.length + females.length}</p>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-semibold mb-4">Signed Up Members</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {directors.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h5 className="font-semibold text-purple-800 mb-3">Directors ({directors.length})</h5>
              <ul className="space-y-2">
                {directors.map(member => (
                  <li key={member.id} className="text-sm text-gray-700 bg-white p-2 rounded">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.phone}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-3">Males ({males.length})</h5>
            {males.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No signups</p>
            ) : (
              <ul className="space-y-2">
                {males.map(member => (
                  <li key={member.id} className="text-sm text-gray-700 bg-white p-2 rounded">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.phone}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <h5 className="font-semibold text-pink-800 mb-3">Females ({females.length})</h5>
            {females.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No signups</p>
            ) : (
              <ul className="space-y-2">
                {females.map(member => (
                  <li key={member.id} className="text-sm text-gray-700 bg-white p-2 rounded">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.phone}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTab;
