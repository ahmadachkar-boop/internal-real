import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Helper function to normalize and check gender
 */
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
 * Custom hook for fetching and organizing NDR members
 * @param {Array} signedUpMemberIds - Array of member IDs signed up for the NDR
 * @returns {Object} Members data including categorized arrays and loading state
 */
const useNDRMembers = (signedUpMemberIds) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!signedUpMemberIds || signedUpMemberIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const membersData = [];
        for (const memberId of signedUpMemberIds) {
          const memberDoc = await getDoc(doc(db, 'members', memberId));
          if (memberDoc.exists()) {
            membersData.push({ id: memberDoc.id, ...memberDoc.data() });
          }
        }
        setMembers(membersData);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [signedUpMemberIds]);

  // Organize members by role and gender
  const directors = members.filter(m => m.role === 'director');
  const nonDirectors = members.filter(m => m.role !== 'director');

  const maleMembers = nonDirectors.filter(m => isMale(m));
  const femaleMembers = nonDirectors.filter(m => isFemale(m));

  return {
    members,
    loading,
    directors,
    maleMembers,
    femaleMembers,
    isMale,
    isFemale,
    normalizeGender
  };
};

export default useNDRMembers;
