/**
 * queueService.js — خدمة واجهة برمجة التطبيقات للطابور
 * تدعم بيانات المريض والوظائف الكاملة
 */

import apiClient from './apiClient';

const queueService = {
  /** إصدار تذكرة جديدة مع امكانية ربطها بملف المريض */
  takeNumber: async ({ clinicId, patientId = null }) => {
    const response = await apiClient.post('/queue/take', { clinicId, patientId });
    return response.data;
  },

  /** استدعاء المريض التالي */
  nextPatient: async (clinicId) => {
    const response = await apiClient.post('/queue/next', { clinicId });
    return response.data;
  },

  /** إعادة نداء المريض الحالي */
  recallCurrentPatient: async (clinicId) => {
    const response = await apiClient.post('/queue/recall', { clinicId });
    return response.data;
  },

  /** تخطي المريض الحالي */
  skipPatient: async (clinicId) => {
    const response = await apiClient.post('/queue/skip', { clinicId });
    return response.data; 
  },

  /** إتمام زيارة المريض الحالي */
  completePatient: async (clinicId) => {
    const response = await apiClient.post('/queue/complete', { clinicId });
    return response.data;
  },

  /** جلب قائمة انتظار عيادة */
  getQueue: async (clinicId) => {
    const response = await apiClient.get(`/queue/${clinicId}`);
    return response.data;
  },

  /** جلب حالة العرض (طبيب / استقبال) */
  getDisplayData: async (clinicId) => {
    const response = await apiClient.get(`/queue/current/${clinicId}`);
    return response.data;
  },

  /** جلب حالة كل العيادات للشاشة الرئيسية */
  getAllDisplay: async () => {
    const response = await apiClient.get('/queue/display/all');
    return response.data;
  },

  /** جلب العيادات من قاعدة البيانات */
  getClinics: async () => {
    const response = await apiClient.get('/settings/clinics');
    return response.data;
  },

  /** إضافة عيادة جديدة */
  createClinic: async (data) => {
    const response = await apiClient.post('/settings/clinics', data);
    return response.data;
  },

  /** تعديل عيادة من لوحة الإدارة */
  updateClinic: async (clinicId, data) => {
    const response = await apiClient.put(`/settings/clinics/${clinicId}`, data);
    return response.data;
  },

  /** حذف عيادة من لوحة الإدارة */
  deleteClinic: async (clinicId) => {
    const response = await apiClient.delete(`/settings/clinics/${clinicId}`);
    return response.data;
  },

  /** إعادة ضبط جميع الطوابير */
  resetAll: async () => {
    const response = await apiClient.post('/queue/reset');
    return response.data;
  },
};


export default queueService;
