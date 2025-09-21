// Test file for Java Execution Service
import JavaExecutionService from "./server/services/javaExecutionService.js";

const javaService = new JavaExecutionService();

// Test 1: Valid Java code
const validCode = `public class Solution {
    public int solve(int[] nums) {
        if (nums.length == 0) {
            return -1;
        }
        return nums.length;
    }
}`;

// Test 2: Invalid Java code (missing semicolon)
const invalidCode = `public class Solution {
    public int solve(int[] nums) {
        if (nums.length == 0) {  // Missing semicolon
            return -1
        }
        return nums.length;
    }
}`;

async function testJavaService() {
  console.log("Testing Java Execution Service...\n");

  // Test valid code
  console.log("Test 1: Valid Java Code");
  try {
    const result1 = await javaService.executeJavaCode(validCode, []);
    console.log("Result:", JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test invalid code
  console.log("Test 2: Invalid Java Code");
  try {
    const result2 = await javaService.executeJavaCode(invalidCode, []);
    console.log("Result:", JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testJavaService();
