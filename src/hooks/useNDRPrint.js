/**
 * Custom hook for managing print functionality for NDR agreements and reports
 * @returns {Object} Print-related functions
 */
const useNDRPrint = () => {
  /**
   * Trigger browser print dialog
   */
  const printPage = () => {
    window.print();
  };

  /**
   * Generate printable agreements data
   * @param {Object} ndr - The NDR object with members data
   * @returns {Object} Formatted data for printing agreements
   */
  const generateAgreementsData = (ndr) => {
    const { directors = [], males = [], females = [] } = ndr;

    // Helper to normalize gender
    const normalizeGender = (gender) => {
      if (!gender) return null;
      const normalized = gender.toLowerCase().trim();
      if (['male', 'm', 'man'].includes(normalized)) return 'male';
      if (['female', 'f', 'woman'].includes(normalized)) return 'female';
      return null;
    };

    // Separate directors by gender for agreement forms
    const maleDirectors = directors.filter(m => normalizeGender(m.gender) === 'male');
    const femaleDirectors = directors.filter(m => normalizeGender(m.gender) === 'female');

    // Combine directors with their respective genders for agreement forms
    const allMales = [...males, ...maleDirectors];
    const allFemales = [...females, ...femaleDirectors];

    return {
      allMales,
      allFemales,
      directors,
      ndr
    };
  };

  return {
    printPage,
    generateAgreementsData
  };
};

export default useNDRPrint;
