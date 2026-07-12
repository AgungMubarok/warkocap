import assert from "node:assert";
import { getProductStockStatus, isLowStockAlert } from "../src/lib/stock";

console.log("Running Stock Filter Tests...");

try {
  // Test 1: Unconfigured stock (missing field, undefined, null, empty string, non-numeric string)
  assert.strictEqual(getProductStockStatus(undefined), "TERSEDIA", "undefined should be TERSEDIA");
  assert.strictEqual(getProductStockStatus(null), "TERSEDIA", "null should be TERSEDIA");
  assert.strictEqual(getProductStockStatus(""), "TERSEDIA", "empty string should be TERSEDIA");
  assert.strictEqual(getProductStockStatus("invalid"), "TERSEDIA", "non-numeric string should be TERSEDIA");

  // Test 2: Stock above threshold
  assert.strictEqual(getProductStockStatus(10), "TERSEDIA", "10 should be TERSEDIA");
  assert.strictEqual(getProductStockStatus("10"), "TERSEDIA", "'10' should be TERSEDIA");

  // Test 3: Stock at threshold
  assert.strictEqual(getProductStockStatus(5), "STOK_RENDAH", "5 should be STOK_RENDAH");

  // Test 4: Stock below threshold but above zero
  assert.strictEqual(getProductStockStatus(3), "STOK_RENDAH", "3 should be STOK_RENDAH");

  // Test 5: Stock zero
  assert.strictEqual(getProductStockStatus(0), "STOK_HABIS", "0 should be STOK_HABIS");
  assert.strictEqual(getProductStockStatus("0"), "STOK_HABIS", "'0' should be STOK_HABIS");

  // Test 6: Negative stock
  assert.strictEqual(getProductStockStatus(-2), "STOK_HABIS", "-2 should be STOK_HABIS");

  // Test isLowStockAlert
  assert.strictEqual(isLowStockAlert(10), false, "10 is not low stock alert");
  assert.strictEqual(isLowStockAlert(5), true, "5 is low stock alert");
  assert.strictEqual(isLowStockAlert(0), true, "0 is low stock alert");
  assert.strictEqual(isLowStockAlert(-2), true, "-2 is low stock alert");
  assert.strictEqual(isLowStockAlert(null), false, "null is not low stock alert");
  assert.strictEqual(isLowStockAlert(undefined), false, "undefined is not low stock alert");

  console.log("✅ All Stock Filter tests passed successfully.");
} catch (error) {
  console.error("❌ Test failed:", (error as Error).message);
  process.exit(1);
}
