import { TZDate } from "@date-fns/tz";
import { 
  getBusinessDateKey, 
  getBusinessDayRange,
  BUSINESS_TIME_ZONE,
  BUSINESS_DAY_CUTOFF_HOUR,
  BUSINESS_DAY_CUTOFF_MINUTE
} from "../src/lib/business-time";

function runTests() {
  console.log("=== Testing Business Time Module ===");

  function createWIB(year: number, month: number, day: number, hour: number, min: number, sec: number) {
    return new TZDate(year, month - 1, day, hour, min, sec, 0, BUSINESS_TIME_ZONE);
  }

  let passed = 0;
  let total = 0;

  function assertEqual(name: string, actual: unknown, expected: unknown) {
    total++;
    if (actual === expected) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}\n  Expected: ${expected}\n  Actual:   ${actual}`);
    }
  }

  // 1. Test 1 second before rollover
  let beforeRollover: TZDate;
  if (BUSINESS_DAY_CUTOFF_HOUR === 0 && BUSINESS_DAY_CUTOFF_MINUTE === 0) {
    beforeRollover = createWIB(2026, 7, 12, 23, 59, 59);
  } else {
    const prevHour = BUSINESS_DAY_CUTOFF_MINUTE === 0 ? BUSINESS_DAY_CUTOFF_HOUR - 1 : BUSINESS_DAY_CUTOFF_HOUR;
    const prevMin = BUSINESS_DAY_CUTOFF_MINUTE === 0 ? 59 : BUSINESS_DAY_CUTOFF_MINUTE - 1;
    beforeRollover = createWIB(2026, 7, 13, prevHour, prevMin, 59);
  }
  assertEqual("1 second before rollover belongs to previous day", getBusinessDateKey(beforeRollover), "2026-07-12");

  // 2. Test exact rollover
  const exactRollover = createWIB(2026, 7, 13, BUSINESS_DAY_CUTOFF_HOUR, BUSINESS_DAY_CUTOFF_MINUTE, 0);
  assertEqual("Exact rollover belongs to current day", getBusinessDateKey(exactRollover), "2026-07-13");

  // 3. Test late night (23:59:59)
  const lateNight = createWIB(2026, 7, 13, 23, 59, 59);
  // Depending on cutoff, 23:59:59 is almost always the current day, assuming cutoff is early morning or midnight.
  assertEqual("23:59:59 belongs to current day", getBusinessDateKey(lateNight), "2026-07-13");

  // 4. Test start/end boundary (e.g. 00:00 to 00:00)
  const range = getBusinessDayRange("2026-07-13");
  // start should be exactly 2026-07-13 cutoff WIB
  assertEqual("Range start is exactly cutoff time", range.start.getTime(), exactRollover.getTime());
  
  // end should be exactly 2026-07-14 cutoff WIB
  const nextRollover = createWIB(2026, 7, 14, BUSINESS_DAY_CUTOFF_HOUR, BUSINESS_DAY_CUTOFF_MINUTE, 0);
  assertEqual("Range end is exactly next day cutoff time", range.end.getTime(), nextRollover.getTime());

  console.log(`\nResults: ${passed} / ${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
