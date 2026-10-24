import { getDb } from '../src/server/db.ts';
import { populateDemoData } from '../src/server/seed.ts';

async function runTests() {
  console.log('--- STARTING CONGO MASTER PROMPT INTEGRATION TESTS ---');
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

  // Ensure DB and demo data are initialized
  await getDb();
  await populateDemoData();
  const db = await getDb();

  function query(sqlStr: string, params: any[] = []): any[] {
    const stmt = db.prepare(sqlStr);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  // TEST 1: Pedagogical References (Part I)
  const refs = query('SELECT * FROM pedagogical_references');
  assert(refs.length >= 17, `Pedagogical references count >= 17 (found: ${refs.length})`);
  
  const seriesA = refs.find((r) => r.serie_code === 'A');
  assert(!!seriesA && seriesA.cycle_code === 'LYCEE', 'Série A present and cycle is LYCEE');
  assert(seriesA?.validation_status === 'CONFIRME', 'Série A validation status is CONFIRME');
  assert(seriesA?.source_url?.includes('ecolesaucongo.com/series.html'), 'Série A links to official source ecolesaucongo.com/series.html');

  const seriesG1 = refs.find((r) => r.serie_code === 'G1');
  assert(!!seriesG1 && seriesG1.cycle_code === 'LYCEE', 'Série G1 present and cycle is LYCEE');

  const seriesH1 = refs.find((r) => r.serie_code === 'H1');
  assert(!!seriesH1 && seriesH1.validation_status === 'PROVISOIRE', 'Série H1 present with PROVISOIRE status');

  const seriesH3 = refs.find((r) => r.serie_code === 'H3');
  assert(!!seriesH3 && seriesH3.validation_status === 'A_VERIFIER', 'Série H3 present with A_VERIFIER status');

  const subjectsA = JSON.parse(seriesA.subjects_json || '[]');
  assert(subjectsA.length >= 7, `Série A has subjects configured (${subjectsA.length} found)`);
  const philo = subjectsA.find((s: any) => s.code === 'PHIL');
  assert(philo?.defaultCoef === 5, 'Philosophie coefficient in Série A is 5');

  // TEST 2: School Tariff Plans (Part II)
  const tariffs = query('SELECT * FROM school_tariff_plans');
  assert(tariffs.length >= 3, `Tariff plans exist in database (found: ${tariffs.length})`);
  
  const tariff1 = tariffs[0];
  const expectedTotalNew = Number(tariff1.inscription_new_fee) + (Number(tariff1.monthly_tuition) * Number(tariff1.months_count)) + Number(tariff1.annex_fees);
  assert(tariff1.annual_total_new === expectedTotalNew, `Annual total calculation is accurate: ${tariff1.annual_total_new} == ${expectedTotalNew}`);

  // TEST 3: Staff Attendance Rules (Part III)
  const rules = query('SELECT * FROM staff_attendance_rules');
  assert(rules.length > 0, `Staff attendance rules table has institutional configuration (found: ${rules.length})`);
  const r0 = rules[0];
  assert(r0.tolerance_minutes === 20 || r0.tolerance_minutes === 15, `Tolerance minutes is valid (got ${r0.tolerance_minutes})`);
  assert(r0.absence_deduction_rate_per_hour === 3000 || r0.absence_deduction_rate_per_hour === 2500, `Absence deduction rate is valid (got ${r0.absence_deduction_rate_per_hour})`);
  assert(r0.checkin_mode_college_lycee === 'PAR_SEANCE', 'Secondary school checkin mode is PAR_SEANCE');
  assert(r0.checkin_mode_preschool_primary === 'JOURNALIER', 'Preschool/Primary checkin mode is JOURNALIER');

  // TEST 4: Staff Salary Parameters (Part IV)
  const salaryParams = query('SELECT * FROM staff_salary_parameters');
  assert(salaryParams.length >= 4, `Staff salary parameters configured (found: ${salaryParams.length})`);
  
  const teacherFixe = salaryParams.find((sp) => sp.wage_type === 'MENSUEL_FIXE' && sp.user_id === 'USR-ENS-01');
  assert(!!teacherFixe && teacherFixe.base_salary === 180000, `MENSUEL_FIXE staff base salary is 180,000 FCFA (got ${teacherFixe?.base_salary})`);

  const teacherHoraire = salaryParams.find((sp) => sp.wage_type === 'HORAIRE' && sp.user_id === 'USR-ENS-02');
  assert(!!teacherHoraire && teacherHoraire.hourly_rate === 3500, `HORAIRE staff hourly rate is 3,500 FCFA/h (got ${teacherHoraire?.hourly_rate})`);

  // TEST 5: Verify Multi-School Isolation & Role Permissions
  const users = query('SELECT * FROM users');
  const promoteur = users.find((u) => u.role === 'PROMOTEUR');
  assert(!!promoteur, 'Promoteur user account exists in system');

  const establishments = query('SELECT * FROM establishments');
  assert(establishments.length >= 1, `At least 1 school establishment preserved (found: ${establishments.length})`);
  assert(establishments.some((e) => e.name.includes('Renaissance')), 'Complexe Scolaire La Renaissance preserved');
  assert(establishments.some((e) => e.name.includes('Faith')), 'Complexe Scolaire Faith site 1 preserved');

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED.`);
  console.log(`========================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
