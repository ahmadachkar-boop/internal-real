import React from 'react';

// Helper function to normalize gender
const normalizeGender = (gender) => {
  if (!gender) return null;
  const normalized = gender.toLowerCase().trim();
  if (['male', 'm', 'man'].includes(normalized)) return 'male';
  if (['female', 'f', 'woman'].includes(normalized)) return 'female';
  return null;
};

/**
 * PrintAgreements component - Generates printable participant agreements
 * @param {Object} ndr - The NDR object with directors, males, females arrays
 * @param {Function} onClose - Callback to close the print view
 */
const PrintAgreements = ({ ndr, onClose }) => {
  const { directors = [], males = [], females = [] } = ndr;

  // Separate directors by gender for agreement forms
  const maleDirectors = directors.filter(m => normalizeGender(m.gender) === 'male');
  const femaleDirectors = directors.filter(m => normalizeGender(m.gender) === 'female');

  // Combine directors with their respective genders for agreement forms
  const allMales = [...males, ...maleDirectors];
  const allFemales = [...females, ...femaleDirectors];

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto print:relative">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-4 print:hidden flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>

        {/* Male Agreement - non-director males + male directors */}
        <div className="page-break mb-8 border-2 border-black p-6">
          <h2 className="text-xl font-bold text-center mb-4">Event Participant Agreement (Males)</h2>

          <div className="mb-6 text-sm">
            <p className="mb-2">By signing this form, I verify that:</p>
            <ol className="list-decimal ml-6 space-y-1">
              <li>I have not consumed any alcoholic beverages or illegal drugs today.</li>
              <li>I am 18 or older and have a valid driver's license.</li>
              <li>I am currently covered under a valid automobile liability insurance policy.</li>
            </ol>
          </div>

          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">Member Name</th>
                <th className="border border-black p-2 text-left">Signature</th>
                <th className="border border-black p-2 text-left">Cell Phone</th>
                <th className="border border-black p-2 text-left">Local Phone</th>
              </tr>
            </thead>
            <tbody>
              {allMales.map((member, index) => (
                <tr key={index}>
                  <td className="border border-black p-3">{member.name}</td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3">{member.phone}</td>
                  <td className="border border-black p-3">{member.phone}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 10 - allMales.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black p-3 h-12"></td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Female Agreement - non-director females + female directors */}
        <div className="page-break mb-8 border-2 border-black p-6">
          <h2 className="text-xl font-bold text-center mb-4">Event Participant Agreement (Females)</h2>

          <div className="mb-6 text-sm">
            <p className="mb-2">By signing this form, I verify that:</p>
            <ol className="list-decimal ml-6 space-y-1">
              <li>I have not consumed any alcoholic beverages or illegal drugs today.</li>
              <li>I am 18 or older and have a valid driver's license.</li>
              <li>I am currently covered under a valid automobile liability insurance policy.</li>
            </ol>
          </div>

          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">Member Name</th>
                <th className="border border-black p-2 text-left">Signature</th>
                <th className="border border-black p-2 text-left">Cell Phone</th>
                <th className="border border-black p-2 text-left">Local Phone</th>
              </tr>
            </thead>
            <tbody>
              {allFemales.map((member, index) => (
                <tr key={index}>
                  <td className="border border-black p-3">{member.name}</td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3">{member.phone}</td>
                  <td className="border border-black p-3">{member.phone}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 10 - allFemales.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black p-3 h-12"></td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3"></td>
                  <td className="border border-black p-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @media print {
          .page-break {
            page-break-after: always;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintAgreements;
