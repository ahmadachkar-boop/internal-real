import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Custom hook for managing NDR notes and documentation
 * @param {Object} ndr - The NDR object
 * @param {boolean} isActive - Whether the NDR is active
 * @returns {Object} Notes state and save functions
 */
const useNDRNotes = (ndr, isActive) => {
  const [notes, setNotes] = useState(ndr.notes || {
    leadership: { don: '', doc: '', duc: '', execs: '', directors: '' },
    carRoles: {},
    couchPhoneRoles: { couch: '', phones: '' },
    updates: [],
    summary: ''
  });

  /**
   * Save notes to Firestore
   */
  const saveNotes = async () => {
    if (!isActive) return;

    try {
      await updateDoc(doc(db, 'ndrs', ndr.id), {
        notes,
        lastUpdated: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  };

  /**
   * Add a progress update
   */
  const addUpdate = (text) => {
    if (!text.trim()) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const newUpdate = {
      time: timeString,
      text: text.trim(),
      timestamp: now.getTime()
    };

    setNotes(prev => ({
      ...prev,
      updates: [...(prev.updates || []), newUpdate]
    }));
  };

  /**
   * Remove a progress update
   */
  const removeUpdate = (index) => {
    setNotes(prev => ({
      ...prev,
      updates: prev.updates.filter((_, i) => i !== index)
    }));
  };

  return {
    notes,
    setNotes,
    saveNotes,
    addUpdate,
    removeUpdate
  };
};

export default useNDRNotes;
