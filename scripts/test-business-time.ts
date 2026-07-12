import { TZDate } from "@date-fns/tz";
import { 
  getBusinessDateKey, 
  getBusinessDayRange,
  BUSINESS_TIME_ZONE 
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

  // 1. Test 03:59 (Should belong to the previous day)
  const beforeRollover = createWIB(2026, 7, 13, 3, 59, 59);
  assertEqual("03:59 belongs to previous day", getBusinessDateKey(beforeRollover), "2026-07-12");

  // 2. Test 04:00 (Should belong to the current day)
  const exactRollover = createWIB(2026, 7, 13, 4, 0, 0);
  assertEqual("04:00 belongs to current day", getBusinessDateKey(exactRollover), "2026-07-13");

  // 3. Test 23:59 (Should belong to the current day)
  const lateNight = createWIB(2026, 7, 13, 23, 59, 59);
  assertEqual("23:59 belongs to current day", getBusinessDateKey(lateNight), "2026-07-13");

  // 4. Test start/end boundary (04:00 to 04:00)
  const range = getBusinessDayRange("2026-07-13");
  // start should be exactly 2026-07-13 04:00:00 WIB
  assertEqual("Range start is exactly 04:00", range.start.getTime(), exactRollover.getTime());
  
  // end should be exactly 2026-07-14 04:00:00 WIB
  const nextRollover = createWIB(2026, 7, 14, 4, 0, 0);
  assertEqual("Range end is exactly next day 04:00", range.end.getTime(), nextRollover.getTime());

  console.log(`\nResults: ${passed} / ${total} passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
