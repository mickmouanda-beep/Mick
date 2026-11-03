import { db } from './src/server/firestore_db.ts';

async function inspectData() {
  const estId = 'EST-MVRXCFTD-3GI4';
  const kenId = 'STU-MVS02LKP-5Z0D';
  const belleId = 'STU-MVTR8N0M-FDBZ';

  console.log('=== 1. STUDENTS ===');
  const kenDoc = await db.collection(`establishments/${estId}/students`).doc(kenId).get();
  console.log('Ken Anice Student Doc:', JSON.stringify(kenDoc.data(), null, 2));

  const belleDoc = await db.collection(`establishments/${estId}/students`).doc(belleId).get();
  console.log('\nBelle Jolie Student Doc:', JSON.stringify(belleDoc.data(), null, 2));

  console.log('\n=== 2. CLASSES ===');
  const classesSnap = await db.collection(`establishments/${estId}/classes`).get();
  console.log('Classes:', classesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  console.log('\n=== 3. EVALUATIONS / GRADES / NOTES ===');
  // Check subcollection and root collection for evaluations and grades
  const evalSubSnap = await db.collection(`establishments/${estId}/evaluations`).get();
  console.log('Evaluations (sub):', evalSubSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  const gradesSubSnap = await db.collection(`establishments/${estId}/grades`).get();
  console.log('Grades (sub):', gradesSubSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  const homeworkGradesSnap = await db.collection(`establishments/${estId}/homework_grades`).get();
  console.log('Homework Grades (sub):', homeworkGradesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  console.log('\n=== 4. ASSIGNMENTS / DEVOIRS ===');
  const assignmentsSnap = await db.collection(`establishments/${estId}/assignments`).get();
  console.log('Assignments (sub):', assignmentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  console.log('\n=== 5. BULLETINS / REPORT CARDS ===');
  const bulletinsSnap = await db.collection(`establishments/${estId}/bulletins`).get();
  console.log('Bulletins (sub):', bulletinsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  console.log('\n=== 6. ATTENDANCE / ABSENCES ===');
  const attendanceSnap = await db.collection(`establishments/${estId}/attendance`).get();
  console.log('Attendance (sub):', attendanceSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  console.log('\n=== 7. TIMETABLE / EMPLOI DU TEMPS ===');
  const timetableSnap = await db.collection(`establishments/${estId}/timetables`).get();
  console.log('Timetables (sub):', timetableSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  console.log('\n=== 8. PAYMENTS ===');
  const paymentsSnap = await db.collection(`establishments/${estId}/payments`).get();
  console.log('Payments (sub):', paymentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

  process.exit(0);
}

inspectData().catch(err => {
  console.error(err);
  process.exit(1);
});
