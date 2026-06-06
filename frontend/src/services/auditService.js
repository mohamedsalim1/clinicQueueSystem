import apiClient from './apiClient';

const auditService = {
  // جلب سجلات المراجعة
  getLogs: async () => {
    const response = await apiClient.get('/audit');
    return response.data;
  }
};

export default auditService;