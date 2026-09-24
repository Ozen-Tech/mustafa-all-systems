import { Router } from 'express';
import {
  checkIn,
  checkOut,
  justifyMissingIndustries,
  clearMissingIndustryJustifications,
  uploadPhotos,
  deleteVisitPhoto,
  submitPriceResearch,
  getCurrentVisit,
  getStores,
  getVisits,
  getDailySummary,
  getVisitCoverage,
  getVisitIndustries,
  getMyOnboarding,
  setMyRoute,
} from '../controllers/promoter.controller';
import {
  absenceDocumentUpload,
  uploadAbsenceDocument,
  uploadAbsenceDocumentBase64,
  upsertMyDayAbsence,
  getMyDayAbsences,
  getMyTodayAbsence,
  deleteMyDayAbsence,
} from '../controllers/dayAbsence.controller';
import { getPromoterGoals } from '../controllers/goal.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/me/onboarding', getMyOnboarding);
router.put('/me/route', setMyRoute);
router.get('/goals', getPromoterGoals);
router.get('/stores', getStores);
router.get('/visits', getVisits);
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);

// Falta do dia / atestado
router.get('/day-absences/today', getMyTodayAbsence);
router.get('/day-absences', getMyDayAbsences);
router.post('/day-absences', upsertMyDayAbsence);
router.delete('/day-absences/:date', deleteMyDayAbsence);
router.post('/day-absences/upload', absenceDocumentUpload, uploadAbsenceDocument);
router.post('/day-absences/upload-base64', uploadAbsenceDocumentBase64);
router.post('/visits/:visitId/justify-missing-industries', justifyMissingIndustries);
router.post(
  '/visits/:visitId/clear-missing-industry-justifications',
  clearMissingIndustryJustifications
);
router.post('/photos', uploadPhotos);
router.delete('/visits/:visitId/photos/:photoId', deleteVisitPhoto);
router.post('/price-research', submitPriceResearch);
router.get('/current-visit', getCurrentVisit);
router.get('/daily-summary', getDailySummary);
router.get('/visits/:visitId/coverage', getVisitCoverage);
router.get('/visits/:visitId/industries', getVisitIndustries);

export default router;
