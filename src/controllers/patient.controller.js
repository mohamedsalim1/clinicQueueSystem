const patientService = require('../services/patient.service');

const searchByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'رقم الهاتف مطلوب' });
    const families = await patientService.searchFamilyByPhone(phone);
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
    res.status(201).json(result);
  } catch (error) { next(error); }
};

const addNewFamilyMember = async (req, res, next) => {
  try {
    const { familyId } = req.body;
    if (!familyId) return res.status(400).json({ message: 'familyId مطلوب' });
    const patient = await patientService.addPatientToFamily(familyId, req.body);
    res.status(201).json(patient);
  } catch (error) { next(error); }
};

module.exports = { searchByPhone, searchByQuery, createFamilyAndPatient, addNewFamilyMember };