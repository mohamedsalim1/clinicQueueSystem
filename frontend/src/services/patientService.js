import apiClient from './apiClient';

const patientService = {
  // البحث برقم الهاتف
  searchByPhone: async (phone) => {
    const response = await apiClient.get(`/patients/search/phone?phone=${phone}`);
    return response.data;
  },

  // البحث بالاسم أو رقم الملف
  searchByQuery: async (query) => {
    const response = await apiClient.get(`/patients/search/query?q=${query}`);
    return response.data;
  },

  // إنشاء عائلة ومريض جديد
  createFamilyAndPatient: async (data) => {
    const response = await apiClient.post('/patients/family', data);
    return response.data;
  },

  // إضافة مريض لعائلة موجودة
  addPatientToFamily: async (data) => {
    const response = await apiClient.post('/patients/family/member', data);
    return response.data;
  },
};

export default patientService;