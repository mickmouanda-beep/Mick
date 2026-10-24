async function testApiEndpoints() {
  console.log('--- STARTING CONGO API ENDPOINTS & SEPARATION OF POWERS TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extra?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${extra ? ` - ${extra}` : ''}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000/api';

  // 1. Login as Promoteur using devKey or login credentials
  const promLoginRes = await fetch(`${BASE_URL}/auth/demo-switch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-eco-dev-key': 'EcoDev2026!',
    },
    body: JSON.stringify({ username: 'promoteur' }),
  });
  const promData = await promLoginRes.json();
  const promToken = promData.token;
  assert(!!promToken, 'Promoteur logged in successfully');

  // 2. Promoteur attempts POST /students -> Must return 403 (Separation of powers)
  const studentRes = await fetch(`${BASE_URL}/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${promToken}`,
    },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Eleve',
      birth_date: '2010-01-01',
      gender: 'M',
      guardian_name: 'Parent Test',
      guardian_phone: '+24206000000',
      guardian_relation: 'Père',
      academic_year: '2026-2027',
      status: 'INSCRIT',
    }),
  });
  assert(studentRes.status === 403, `Promoteur POST /students blocked with 403 Forbidden (got ${studentRes.status})`);
  const studentErr = await studentRes.json();
  assert(studentErr.error?.includes('Séparation des pouvoirs'), `Error mentions separation of powers: "${studentErr.error}"`);

  // 3. Promoteur attempts POST /finance/payments -> Must return 403 (Cashier restriction)
  const paymentRes = await fetch(`${BASE_URL}/finance/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${promToken}`,
    },
    body: JSON.stringify({
      student_id: 'STU-001',
      fee_category_id: 'CAT-SCOL',
      amount: 25000,
      payment_method: 'ESPECES',
    }),
  });
  assert(paymentRes.status === 403, `Promoteur POST /finance/payments blocked with 403 Forbidden (got ${paymentRes.status})`);
  const paymentErr = await paymentRes.json();
  assert(paymentErr.error?.includes('Séparation des pouvoirs'), `Error mentions cashier restriction: "${paymentErr.error}"`);

  // 4. Promoteur attempts POST /teacher-attendances -> Must return 403 (Attendance punching restriction)
  const punchRes = await fetch(`${BASE_URL}/teacher-attendances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${promToken}`,
    },
    body: JSON.stringify({
      teacherId: 'USR-ENS-01',
      date: '2026-10-22',
      actualArrivalTime: '08:00',
      actualDepartureTime: '10:00',
    }),
  });
  assert(punchRes.status === 403, `Promoteur POST /teacher-attendances blocked with 403 Forbidden (got ${punchRes.status})`);

  // 5. Promoteur CAN configure tariff plans (POST /tariffs)
  const tariffRes = await fetch(`${BASE_URL}/tariffs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${promToken}`,
    },
    body: JSON.stringify({
      academicYear: '2026-2027',
      cycleCode: 'LYCEE',
      levelCode: 'Terminale',
      inscriptionNewFee: 30000,
      reinscriptionFee: 20000,
      monthlyTuition: 45000,
      monthsCount: 9,
      paymentSchedule: 'MENSUEL',
      annexFees: 20000,
      annexFeesDetails: 'Assurance & carte scolaire',
    }),
  });
  assert(tariffRes.status === 201, `Promoteur can create tariff plan (got status ${tariffRes.status})`);
  const createdTariff = await tariffRes.json();
  assert(createdTariff.annual_total_new === 455000, `Calculated annual total: 30000 + (45000 * 9) + 20000 = ${createdTariff.annual_total_new}`);

  // 6. Promoteur CAN update staff attendance rules (PUT /staff-attendance/rules)
  const rulesUpdateRes = await fetch(`${BASE_URL}/staff-attendance/rules`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${promToken}`,
    },
    body: JSON.stringify({
      workStartTime: '07:30',
      workEndTime: '17:00',
      toleranceMinutes: 20,
      absenceDeductionRatePerHour: 3000,
      overtimeHourlyBonus: 4000,
      checkinModePreschoolPrimary: 'JOURNALIER',
      checkinModeCollegeLycee: 'PAR_SEANCE',
    }),
  });
  assert(rulesUpdateRes.status === 200, `Promoteur can update attendance rules (got ${rulesUpdateRes.status})`);

  // 7. Login as Surveillant to test pointage and overlap conflict detection
  const survLoginRes = await fetch(`${BASE_URL}/auth/demo-switch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-eco-dev-key': 'EcoDev2026!',
    },
    body: JSON.stringify({ username: 'surveillant' }),
  });
  const survData = await survLoginRes.json();
  const survToken = survData.token;
  assert(!!survToken, 'Surveillant logged in successfully');

  // Surveillant punches teacher from 08:00 to 10:00 on 2026-10-25
  const punch1Res = await fetch(`${BASE_URL}/teacher-attendances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${survToken}`,
    },
    body: JSON.stringify({
      teacherId: 'USR-ENS-01',
      date: '2026-10-25',
      actualArrivalTime: '08:00',
      actualDepartureTime: '10:00',
      scheduledHours: 2,
      hoursDone: 2,
      presenceHours: 2,
      taughtHours: 2,
      status: 'PRESENT',
    }),
  });
  assert(punch1Res.status === 201, `Surveillant successfully recorded pointage (got ${punch1Res.status})`);

  // Surveillant punches overlapping session for same teacher: 09:00 to 11:00 -> Must return 409 Conflict
  const punchOverlapRes = await fetch(`${BASE_URL}/teacher-attendances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${survToken}`,
    },
    body: JSON.stringify({
      teacherId: 'USR-ENS-01',
      date: '2026-10-25',
      actualArrivalTime: '09:00',
      actualDepartureTime: '11:00',
      scheduledHours: 2,
      hoursDone: 2,
      presenceHours: 2,
      taughtHours: 2,
      status: 'PRESENT',
    }),
  });
  assert(punchOverlapRes.status === 409, `Overlap detection returns 409 Conflict (got ${punchOverlapRes.status})`);
  const overlapErr = await punchOverlapRes.json();
  assert(overlapErr.error?.includes('Chevauchement'), `Error mentions timetable overlap: "${overlapErr.error}"`);

  // 8. Test automated payroll calculation (POST /finance/payroll/auto-calculate)
  const comptLoginRes = await fetch(`${BASE_URL}/auth/demo-switch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-eco-dev-key': 'EcoDev2026!',
    },
    body: JSON.stringify({ username: 'comptable' }),
  });
  const comptToken = (await comptLoginRes.json()).token;

  const autoPayRes = await fetch(`${BASE_URL}/finance/payroll/auto-calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${comptToken}`,
    },
    body: JSON.stringify({
      period: '2026-10',
    }),
  });
  assert(autoPayRes.status === 200, `Automated payroll calculation succeeded (got ${autoPayRes.status})`);
  const autoPayData = await autoPayRes.json();
  assert(autoPayData.records?.length > 0, `Automated payroll returned records (${autoPayData.records?.length} found)`);
  assert(autoPayData.records[0].status === 'CALCULE', `Generated record has status CALCULE (${autoPayData.records[0].status})`);

  console.log(`\n========================================`);
  console.log(`API TEST SUMMARY: ${passed} PASSED, ${failed} FAILED.`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
}

testApiEndpoints().catch((err) => {
  console.error('API test execution error:', err);
  process.exit(1);
});
