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

  // ✨ جلب كل العائلات (لصفحة الإدارة)
  getAllFamilies: async (query = '', page = 1, limit = 10) => {
    const response = await apiClient.get(`/patients/families?q=${query}&page=${page}&limit=${limit}`);
    return response.data;
  },

  // ✨ جلب السجل الطبي بالكامل لمريض
  getMedicalRecord: async (patientId) => {
    const response = await apiClient.get(`/patients/${patientId}/medical-record`);
    return response.data;
  },

  // ✨ تعديل مريض
  updatePatient: async (patientId, data) => {
    const response = await apiClient.put(`/patients/${patientId}`, data);
    return response.data;
  },

  // ✨ حذف مريض
  deletePatient: async (patientId) => {
    const response = await apiClient.delete(`/patients/${patientId}`);
    return response.data;
  },

  // ✨ تعديل عائلة
  updateFamily: async (familyId, data) => {
    const response = await apiClient.put(`/patients/families/${familyId}`, data);
    return response.data;
  },

  // ✨ حذف عائلة بالكامل
  deleteFamily: async (familyId) => {
    const response = await apiClient.delete(`/patients/families/${familyId}`);
    return response.data;
  }
};

export default patientService;