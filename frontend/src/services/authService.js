import apiClient from './apiClient';

const authService = {
  // ... دالة login إذا كانت موجودة
  
  // ✨ تغيير كلمة المرور للمستخدم الحالي
  changePassword: async (passwordData) => {
    const response = await apiClient.put('/auth/change-password', passwordData);
    return response.data;
  }
};

export default authService;