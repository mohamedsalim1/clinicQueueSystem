/**
 * settings.controller.js — معالج طلبات الإعدادات
 */

const settingsService = require('../services/settings.service');
const queueService = require('../services/queue.service');
const auditService = require('../services/audit.service');
const { getIO } = require('../sockets');

const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updated = await settingsService.updateSettings(req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'UPDATE',
      entity: 'SystemSetting',
      newValue: req.body
    });

    // بث تحديث شريط الأخبار لجميع الشاشات فوراً
    try {
      const io = getIO();
      io.emit('settings-updated', updated);
      if (updated.tickerText) {
        io.emit('ticker-updated', updated.tickerText);
      }
    } catch (_) { /* Socket قد لا يكون متاحاً في بعض الأحيان */ }

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

const broadcastClinicsUpdate = async () => {
  try {
    const io = getIO();
    const [clinics, allClinicsState] = await Promise.all([
      queueService.getClinics(),
      queueService.getAllClinicsState(),
    ]);

    io.emit('clinics-updated', { clinics });
    io.to('display-global').emit('all-clinics-state', allClinicsState);
  } catch (_) { /* Socket قد لا يكون متاحاً في بعض الأحيان */ }
};

const getClinics = async (req, res, next) => {
  try {
    const clinics = await queueService.getClinicsForUser(req.user);
    return res.status(200).json({ clinics });
  } catch (error) {
    next(error);
  }
};

const createClinic = async (req, res, next) => {
  try {
    const clinic = await queueService.createClinic(req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'CREATE',
      entity: 'Clinic',
      entityId: clinic.id,
      newValue: { name: clinic.name, prefix: clinic.prefix }
    });
    await broadcastClinicsUpdate();
    return res.status(201).json({ clinic });
  } catch (error) {
    next(error);
  }
};

const updateClinic = async (req, res, next) => {
  try {
    const clinic = await queueService.updateClinic(req.params.clinicId, req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'UPDATE',
      entity: 'Clinic',
      entityId: req.params.clinicId,
      newValue: req.body
    });
    await broadcastClinicsUpdate();
    return res.status(200).json({ clinic });
  } catch (error) {
    next(error);
  }
};

const deleteClinic = async (req, res, next) => {
  try {
    const clinic = await queueService.deleteClinic(req.params.clinicId);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'DELETE',
      entity: 'Clinic',
      entityId: req.params.clinicId
    });
    await broadcastClinicsUpdate();
    return res.status(200).json({ clinic, message: 'تم حذف العيادة' });
  } catch (error) {
    next(error);
  }
};

const exportBackup = async (req, res, next) => {
  try {
    const backup = await settingsService.exportBackup();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=darayya_clinic_backup_${new Date().toISOString().split('T')[0]}.json`);
    return res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, updateSettings, getClinics, createClinic, updateClinic, deleteClinic, exportBackup };
