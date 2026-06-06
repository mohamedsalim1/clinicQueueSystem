const patientService = require('../services/patient.service');
const auditService = require('../services/audit.service');

const searchByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'رقم الهاتف مطلوب' });
    const families = await patientService.searchFamilyByPhoneOrName(phone);
    res.status(200).json(families);
  } catch (error) { next(error); }
};

const searchByQuery = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'نص البحث مطلوب' });
    const patients = await patientService.searchPatients(q);
    res.status(200).json(patients);
  } catch (error) { next(error); }
};

const createFamilyAndPatient = async (req, res, next) => {
  try {
    const result = await patientService.createFamilyWithPatient(req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'CREATE',
      entity: 'Family',
      entityId: result.family?.id,
      newValue: { primaryName: result.family?.primaryName, patientName: result.patient?.fullName }
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
};

const addNewFamilyMember = async (req, res, next) => {
  try {
    const { familyId } = req.body;
    if (!familyId) return res.status(400).json({ message: 'familyId مطلوب' });
    const patient = await patientService.addPatientToFamily(familyId, req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'CREATE',
      entity: 'Patient',
      entityId: patient.id,
      newValue: { fullName: patient.fullName, familyId }
    });
    res.status(201).json(patient);
  } catch (error) { next(error); }
};

const getAllFamilies = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const result = await patientService.getAllFamilies(q || '', pageNum, limitNum);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

const updatePatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await patientService.updatePatient(patientId, req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'UPDATE',
      entity: 'Patient',
      entityId: patientId,
      newValue: { fullName: patient.fullName, fileNumber: patient.fileNumber }
    });
    res.status(200).json(patient);
  } catch (error) { next(error); }
};

const deletePatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    await patientService.deletePatient(patientId);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'DELETE',
      entity: 'Patient',
      entityId: patientId
    });
    res.status(200).json({ message: 'تم حذف المريض بنجاح' });
  } catch (error) { next(error); }
};

const updateFamily = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const family = await patientService.updateFamily(familyId, req.body);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'UPDATE',
      entity: 'Family',
      entityId: familyId,
      newValue: { primaryName: family.primaryName, primaryPhone: family.primaryPhone }
    });
    res.status(200).json(family);
  } catch (error) { next(error); }
};

const deleteFamily = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    await patientService.deleteFamily(familyId);
    await auditService.logAction({
      userId: req.user?.id,
      actionType: 'DELETE',
      entity: 'Family',
      entityId: familyId
    });
    res.status(200).json({ message: 'تم حذف العائلة بنجاح' });
  } catch (error) { next(error); }
};

const getPatientMedicalRecord = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const record = await patientService.getPatientMedicalRecord(patientId);
    res.status(200).json(record);
  } catch (error) { next(error); }
};

module.exports = { 
  searchByPhone, 
  searchByQuery, 
  createFamilyAndPatient, 
  addNewFamilyMember, 
  getAllFamilies,
  updatePatient,
  deletePatient,
  updateFamily,
  deleteFamily,
  getPatientMedicalRecord
};
