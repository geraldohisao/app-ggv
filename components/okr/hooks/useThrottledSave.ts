// Placeholder throttled save hook (legacy).
export const useThrottledSave = () => {
  return { saveStatus: 'idle', save: async () => {} };
};

