import React, { useState } from 'react';
import { GripVertical, AlertTriangle } from 'lucide-react';

// Helper function to normalize and check gender
const normalizeGender = (gender) => {
  if (!gender) return null;
  const normalized = gender.toLowerCase().trim();
  if (['male', 'm', 'man'].includes(normalized)) return 'male';
  if (['female', 'f', 'woman'].includes(normalized)) return 'female';
  return null;
};

const isMale = (member) => normalizeGender(member?.gender) === 'male';
const isFemale = (member) => normalizeGender(member?.gender) === 'female';

/**
 * AssignmentsTabEditable component - Drag and drop interface for assigning members to roles
 * @param {Object} assignments - Current assignments state
 * @param {Function} setAssignments - Function to update assignments
 * @param {Array} members - Array of all members
 * @param {Array} directors - Array of director members
 * @param {Array} males - Array of male members
 * @param {Array} females - Array of female members
 * @param {number} availableCars - Number of available cars
 * @param {Function} setAvailableCars - Function to update available cars count
 */
const AssignmentsTabEditable = ({ assignments, setAssignments, members, directors, males, females, availableCars, setAvailableCars }) => {
  const [draggedMember, setDraggedMember] = useState(null);

  const handleDragStart = (e, member) => {
    setDraggedMember(member);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedMember(null);
  };

  const validateCarGenders = (carMembers, newMemberId) => {
    const getMemberById = (id) => members.find(m => m.id === id);
    const allMembers = [...carMembers, newMemberId].map(id => getMemberById(id)).filter(Boolean);

    const hasMale = allMembers.some(m => isMale(m));
    const hasFemale = allMembers.some(m => isFemale(m));

    return { hasMale, hasFemale };
  };

  const handleDrop = (e, role, carNum = null) => {
    e.preventDefault();
    if (!draggedMember) return;

    const isAlreadyAssigned = carNum
      ? (assignments.cars[carNum] || []).includes(draggedMember.id)
      : role === 'don' || role === 'doc' || role === 'duc'
      ? assignments[role] === draggedMember.id
      : (assignments[role] || []).includes(draggedMember.id);

    if (isAlreadyAssigned) {
      alert(`${draggedMember.name} is already assigned to this position!`);
      return;
    }

    const isDuplicating = Object.entries(assignments).some(([key, value]) => {
      if (key === 'cars') {
        return Object.values(value).some(carMembers => carMembers.includes(draggedMember.id));
      }
      return Array.isArray(value)
        ? value.includes(draggedMember.id)
        : value === draggedMember.id;
    });

    if (isDuplicating) {
      const shouldDuplicate = window.confirm(
        `${draggedMember.name} is already assigned elsewhere. Do you want to assign them to this position as well (duplicate)?`
      );
      if (!shouldDuplicate) return;
    }

    // Handle car assignments with Car 1 validation
    if (carNum) {
      const currentCar = assignments.cars[carNum] || [];
      const newCarMembers = [...currentCar, draggedMember.id];

      // Validate Car 1 requirements - only check when there will be 2+ people
      if (carNum === 1 && newCarMembers.length >= 2) {
        const validation = validateCarGenders(currentCar, draggedMember.id);

        if (!validation.hasMale || !validation.hasFemale) {
          const message = !validation.hasMale
            ? 'Car 1 requires at least 1 male member when 2 or more people are assigned. Please add a male to Car 1.'
            : 'Car 1 requires at least 1 female member when 2 or more people are assigned. Please add a female to Car 1.';

          if (!window.confirm(message + ' Do you want to continue adding this member anyway?')) {
            return;
          }
        }
      }

      setAssignments({
        ...assignments,
        cars: {
          ...assignments.cars,
          [carNum]: newCarMembers
        }
      });
      return;
    }

    // Handle single role assignments (DON, DOC, DUC)
    if (role === 'don' || role === 'doc' || role === 'duc') {
      setAssignments({
        ...assignments,
        [role]: draggedMember.id
      });
      return;
    }

    // Handle multi-role assignments (couch, phones, northgate)
    const currentPosition = assignments[role] || [];
    setAssignments({
      ...assignments,
      [role]: [...currentPosition, draggedMember.id]
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const removeMember = (role, memberId, carNum = null) => {
    if (carNum) {
      const currentCar = assignments.cars[carNum] || [];
      const updatedCar = currentCar.filter(id => id !== memberId);

      // Validate Car 1 after removal (if 2+ members remain)
      if (carNum === 1 && updatedCar.length >= 2) {
        const remainingMembers = updatedCar.map(id => members.find(m => m.id === id)).filter(Boolean);
        const hasMale = remainingMembers.some(m => isMale(m));
        const hasFemale = remainingMembers.some(m => isFemale(m));

        if (!hasMale || !hasFemale) {
          const memberName = members.find(m => m.id === memberId)?.name || 'this member';
          if (!window.confirm(
            `Warning: Removing ${memberName} will leave Car 1 without opposite gender members.\n\n` +
            `Car 1 requires both male and female members when 2+ people are assigned.\n\n` +
            `Continue with removal?`
          )) {
            return; // Cancel removal
          }
        }
      }

      setAssignments({
        ...assignments,
        cars: {
          ...assignments.cars,
          [carNum]: updatedCar
        }
      });
      return;
    }

    if (role === 'don' || role === 'doc' || role === 'duc') {
      setAssignments({
        ...assignments,
        [role]: null
      });
      return;
    }

    const currentPosition = assignments[role] || [];
    setAssignments({
      ...assignments,
      [role]: currentPosition.filter(id => id !== memberId)
    });
  };

  const getMemberById = (id) => members.find(m => m.id === id);

  // Helper function to check if a member is assigned anywhere
  const isMemberAssigned = (memberId) => {
    // Check leadership roles
    if (assignments.don === memberId || assignments.doc === memberId || assignments.duc === memberId) {
      return true;
    }
    // Check cars
    if (assignments.cars) {
      for (const carMembers of Object.values(assignments.cars)) {
        if (carMembers.includes(memberId)) return true;
      }
    }
    // Check other positions
    if ((assignments.couch || []).includes(memberId)) return true;
    if ((assignments.phones || []).includes(memberId)) return true;
    if ((assignments.northgate || []).includes(memberId)) return true;
    return false;
  };

  // Check Car 1 compliance
  const car1Members = (assignments.cars[1] || []).map(id => getMemberById(id)).filter(Boolean);
  const car1HasMale = car1Members.some(m => isMale(m));
  const car1HasFemale = car1Members.some(m => isFemale(m));
  const car1Compliant = car1Members.length < 2 || (car1HasMale && car1HasFemale);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Member Assignments (Drag & Drop)</h3>

        {/* Cars Available Input */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Cars Available This Weekend:</label>
          <input
            type="number"
            min="0"
            max="20"
            value={availableCars}
            onChange={(e) => setAvailableCars(parseInt(e.target.value) || 0)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {availableCars === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            Please set the number of cars available for this weekend above to begin assignments.
          </p>
        </div>
      )}

      {availableCars >= 1 && car1Members.length >= 2 && !car1Compliant && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <p className="text-red-800 font-bold">Car 1 Requirements Not Met</p>
            <p className="text-red-700 text-sm mt-1">
              Car 1 must have at least 1 male and 1 female member when 2 or more people are assigned.
              Current: {car1HasMale ? '✓ Male' : '✗ Male'} | {car1HasFemale ? '✓ Female' : '✗ Female'}
            </p>
          </div>
        </div>
      )}

      {/* Available Members */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-3 text-gray-700">Available Members (Drag to Assign)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {members.map(member => {
            const isAssigned = isMemberAssigned(member.id);
            return (
              <div
                key={member.id}
                draggable
                onDragStart={(e) => handleDragStart(e, member)}
                onDragEnd={handleDragEnd}
                className={`border rounded p-2 cursor-move transition flex items-center gap-1 ${
                  isAssigned
                    ? 'bg-gray-200 border-gray-400 text-gray-500 hover:bg-gray-300 hover:border-gray-500'
                    : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                }`}
              >
                <GripVertical size={14} className={isAssigned ? 'text-gray-400' : 'text-gray-400'} />
                <span className="text-sm font-medium truncate">{member.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leadership Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          onDrop={(e) => handleDrop(e, 'don')}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50 min-h-24"
        >
          <h5 className="font-semibold text-purple-800 mb-2">DON (Director on Night)</h5>
          {assignments.don ? (
            <div className="bg-white border border-purple-300 rounded p-2 flex justify-between items-center">
              <span className="text-sm font-medium">{getMemberById(assignments.don)?.name}</span>
              <button
                onClick={() => removeMember('don', assignments.don)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Drop director here</p>
          )}
        </div>

        <div
          onDrop={(e) => handleDrop(e, 'doc')}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 min-h-24"
        >
          <h5 className="font-semibold text-blue-800 mb-2">DOC (Director on Call)</h5>
          {assignments.doc ? (
            <div className="bg-white border border-blue-300 rounded p-2 flex justify-between items-center">
              <span className="text-sm font-medium">{getMemberById(assignments.doc)?.name}</span>
              <button
                onClick={() => removeMember('doc', assignments.doc)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Drop director here</p>
          )}
        </div>

        <div
          onDrop={(e) => handleDrop(e, 'duc')}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50 min-h-24"
        >
          <h5 className="font-semibold text-green-800 mb-2">DUC (Director Under Cover)</h5>
          {assignments.duc ? (
            <div className="bg-white border border-green-300 rounded p-2 flex justify-between items-center">
              <span className="text-sm font-medium">{getMemberById(assignments.duc)?.name}</span>
              <button
                onClick={() => removeMember('duc', assignments.duc)}
                className="text-red-600 hover:text-red-800 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Drop director here (undercover)</p>
          )}
        </div>
      </div>

      {/* Cars and Other Positions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: availableCars }, (_, i) => i + 1).map(carNum => {
          const isCarOne = carNum === 1;
          const carMembers = (assignments.cars[carNum] || []).map(id => getMemberById(id)).filter(Boolean);
          const hasMale = carMembers.some(m => isMale(m));
          const hasFemale = carMembers.some(m => isFemale(m));
          const hasOppositeGenders = hasMale && hasFemale;
          const shouldShowWarning = isCarOne && carMembers.length >= 2 && !hasOppositeGenders;
          const isEligibleForSingleRider = carMembers.length >= 2 && hasOppositeGenders;

          return (
            <div
              key={carNum}
              onDrop={(e) => handleDrop(e, null, carNum)}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed rounded-lg p-4 min-h-32 ${
                shouldShowWarning
                  ? 'border-red-400 bg-red-50'
                  : 'border-blue-300 bg-blue-50'
              }`}
            >
              <h5 className={`font-semibold mb-2 flex items-center justify-between ${
                shouldShowWarning ? 'text-red-800' : 'text-blue-800'
              }`}>
                <span>Car {carNum}</span>
                <div className="flex items-center gap-1">
                  {isEligibleForSingleRider && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-normal" title="Eligible for single riders">
                      1R ✓
                    </span>
                  )}
                  {shouldShowWarning && (
                    <AlertTriangle size={16} className="text-red-600" />
                  )}
                </div>
              </h5>
              {isCarOne && (
                <p className="text-xs text-gray-600 mb-2">
                  Required: 1 Male + 1 Female (when 2+ members)
                </p>
              )}
              <div className="space-y-1">
                {(assignments.cars[carNum] || []).map(memberId => {
                  const member = getMemberById(memberId);
                  return member ? (
                    <div key={memberId} className="bg-white border border-blue-200 rounded p-1 flex justify-between items-center">
                      <span className="text-xs font-medium truncate">{member.name}</span>
                      <button
                        onClick={() => removeMember('cars', memberId, carNum)}
                        className="text-red-600 hover:text-red-800 text-xs ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
                {(assignments.cars[carNum] || []).length === 0 && (
                  <p className="text-xs text-gray-500 italic">Drop members here</p>
                )}
              </div>
            </div>
          );
        })}

        <div
          onDrop={(e) => handleDrop(e, 'couch')}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50 min-h-32"
        >
          <h5 className="font-semibold text-orange-800 mb-2">Couch</h5>
          <div className="space-y-1">
            {(assignments.couch || []).map(memberId => {
              const member = getMemberById(memberId);
              return member ? (
                <div key={memberId} className="bg-white border border-orange-200 rounded p-1 flex justify-between items-center">
                  <span className="text-xs font-medium truncate">{member.name}</span>
                  <button
                    onClick={() => removeMember('couch', memberId)}
                    className="text-red-600 hover:text-red-800 text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              ) : null;
            })}
            {(assignments.couch || []).length === 0 && (
              <p className="text-xs text-gray-500 italic">Drop members here</p>
            )}
          </div>
        </div>

        <div
          onDrop={(e) => handleDrop(e, 'phones')}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50 min-h-32"
        >
          <h5 className="font-semibold text-green-800 mb-2">Phones</h5>
          <div className="space-y-1">
            {(assignments.phones || []).map(memberId => {
              const member = getMemberById(memberId);
              return member ? (
                <div key={memberId} className="bg-white border border-green-200 rounded p-1 flex justify-between items-center">
                  <span className="text-xs font-medium truncate">{member.name}</span>
                  <button
                    onClick={() => removeMember('phones', memberId)}
                    className="text-red-600 hover:text-red-800 text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              ) : null;
            })}
            {(assignments.phones || []).length === 0 && (
              <p className="text-xs text-gray-500 italic">Drop members here</p>
            )}
          </div>
        </div>

        <div
          onDrop={(e) => handleDrop(e, 'northgate')}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-red-300 rounded-lg p-4 bg-red-50 min-h-32"
        >
          <h5 className="font-semibold text-red-800 mb-2">Northgate</h5>
          <div className="space-y-1">
            {(assignments.northgate || []).map(memberId => {
              const member = getMemberById(memberId);
              return member ? (
                <div key={memberId} className="bg-white border border-red-200 rounded p-1 flex justify-between items-center">
                  <span className="text-xs font-medium truncate">{member.name}</span>
                  <button
                    onClick={() => removeMember('northgate', memberId)}
                    className="text-red-600 hover:text-red-800 text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              ) : null;
            })}
            {(assignments.northgate || []).length === 0 && (
              <p className="text-xs text-gray-500 italic">Drop members here</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsTabEditable;
