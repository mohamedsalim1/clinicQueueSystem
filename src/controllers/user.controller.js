const userService = require('../services/user.service');

const listUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (error) { next(error); }
};

const createUser = async (req, res, next) => {
  try {
    // تمرير دور من أنشأ الحساب للأمان
    const user = await userService.createUser(req.body, req.user.role);
    res.status(201).json({ message: 'تم إنشاء المستخدم بنجاح', user });
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user.role);
    res.status(200).json({ message: 'تم تحديث المستخدم بنجاح', user });
  } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user.role);
    res.status(200).json({ message: 'تم تعطيل الحساب بنجاح' });
  } catch (error) { next(error); }
};

module.exports = { listUsers, createUser, updateUser, deleteUser };