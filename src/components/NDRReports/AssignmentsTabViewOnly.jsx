import React from 'react';

/**
 * AssignmentsTabViewOnly component - View-only display of member assignments
 * @param {Object} ndr - The NDR object
 * @param {Array} members - Array of all members
 */
const AssignmentsTabViewOnly = ({ ndr, members }) => {
  const assignments = ndr.assignments || {
    cars: {},
    couch: [],
    phones: [],
    doc: null,
    duc: null,
    don: null,
    northgate: []
  };

  const availableCars = ndr.availableCars || 0;
  const getMemberById = (id) => members.find(m => m.id === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Member Assignments (View Only)</h3>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">Cars Available:</span> {availableCars}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h5 className="font-semibold text-purple-800 mb-2">DON (Director on Night)</h5>
          {assignments.don ? (
            <div className="bg-white p-2 rounded">
              <p className="text-sm font-medium">{getMemberById(assignments.don)?.name || 'Unknown'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Not assigned</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-800 mb-2">DOC (Director on Call)</h5>
          {assignments.doc ? (
            <div className="bg-white p-2 rounded">
              <p className="text-sm font-medium">{getMemberById(assignments.doc)?.name || 'Unknown'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Not assigned</p>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-semibold text-green-800 mb-2">DUC (Director Under Cover)</h5>
          {assignments.duc ? (
            <div className="bg-white p-2 rounded">
              <p className="text-sm font-medium">{getMemberById(assignments.duc)?.name || 'Unknown'}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Not assigned</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: availableCars }, (_, i) => i + 1).map(carNum => (
          <div key={carNum} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2">Car {carNum}</h5>
            <div className="space-y-1">
              {assignments.cars[carNum]?.length > 0 ? (
                assignments.cars[carNum].map(memberId => {
                  const member = getMemberById(memberId);
                  return member ? (
                    <div key={memberId} className="bg-white p-1 rounded text-xs">
                      {member.name}
                    </div>
                  ) : null;
                })
              ) : (
                <p className="text-xs text-gray-500 italic">Empty</p>
              )}
            </div>
          </div>
        ))}

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h5 className="font-semibold text-orange-800 mb-2">Couch</h5>
          <div className="space-y-1">
            {assignments.couch?.length > 0 ? (
              assignments.couch.map(memberId => {
                const member = getMemberById(memberId);
                return member ? (
                  <div key={memberId} className="bg-white p-1 rounded text-xs">
                    {member.name}
                  </div>
                ) : null;
              })
            ) : (
              <p className="text-xs text-gray-500 italic">Empty</p>
            )}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-semibold text-green-800 mb-2">Phones</h5>
          <div className="space-y-1">
            {assignments.phones?.length > 0 ? (
              assignments.phones.map(memberId => {
                const member = getMemberById(memberId);
                return member ? (
                  <div key={memberId} className="bg-white p-1 rounded text-xs">
                    {member.name}
                  </div>
                ) : null;
              })
            ) : (
              <p className="text-xs text-gray-500 italic">Empty</p>
            )}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="font-semibold text-red-800 mb-2">Northgate</h5>
          <div className="space-y-1">
            {assignments.northgate?.length > 0 ? (
              assignments.northgate.map(memberId => {
                const member = getMemberById(memberId);
                return member ? (
                  <div key={memberId} className="bg-white p-1 rounded text-xs">
                    {member.name}
                  </div>
                ) : null;
              })
            ) : (
              <p className="text-xs text-gray-500 italic">Empty</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsTabViewOnly;
