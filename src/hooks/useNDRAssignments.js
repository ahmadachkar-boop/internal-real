import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Custom hook for managing member assignments to roles and cars
 * @param {Object} ndr - The NDR object
 * @param {Array} members - Array of member objects
 * @param {boolean} isActive - Whether the NDR is active
 * @returns {Object} Assignments state and save functions
 */
const useNDRAssignments = (ndr, members, isActive, notes, setNotes) => {
  const [assignments, setAssignments] = useState(ndr.assignments || {
    cars: {},
    couch: [],
    phones: [],
    doc: null,
    duc: null,
    don: null,
    northgate: []
  });

  // Auto-sync assignments to notes
  useEffect(() => {
    if (!isActive) return;

    const getMemberById = (id) => members.find(m => m.id === id);

    const updatedLeadership = {
      don: assignments.don ? getMemberById(assignments.don)?.name || '' : '',
      doc: assignments.doc ? getMemberById(assignments.doc)?.name || '' : '',
      duc: assignments.duc ? getMemberById(assignments.duc)?.name || '' : '',
      execs: notes.leadership?.execs || '',
      directors: notes.leadership?.directors || ''
    };

    const updatedCouchPhoneRoles = {
      couch: (assignments.couch || []).map(id => getMemberById(id)?.name).filter(Boolean).join(', '),
      phones: (assignments.phones || []).map(id => getMemberById(id)?.name).filter(Boolean).join(', ')
    };

    setNotes(prev => ({
      ...prev,
      leadership: updatedLeadership,
      couchPhoneRoles: updatedCouchPhoneRoles
    }));
  }, [assignments, members, isActive]);

  /**
   * Save assignments to Firestore
   */
  const saveAssignments = async () => {
    if (!isActive) return;

    try {
      await updateDoc(doc(db, 'ndrs', ndr.id), {
        assignments,
        lastUpdated: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving assignments:', error);
      throw error;
    }
  };

  return {
    assignments,
    setAssignments,
    saveAssignments
  };
};

export default useNDRAssignments;
