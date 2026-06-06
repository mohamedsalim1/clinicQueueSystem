import apiClient from './apiClient';

const visitService = {
  // جلب التاريخ الطبي للمريض
  getVisits: async (patientId) => {
    const response = await apiClient.get(`/visits/${patientId}`);
    return response.data;
  },

  // حفظ زيارة جديدة (التشخيص والوصفة)
  addVisit: async (visitData) => {
    const response = await apiClient.post('/visits', visitData);
    return response.data;
  }
};

export default visitService;