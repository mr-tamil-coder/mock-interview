import express from "express";
import JavaExecutionService from "../services/javaExecutionService.js";

const router = express.Router();
const javaService = new JavaExecutionService();

// Execute Java code
router.post("/execute", async (req, res) => {
  try {
    const { code, testCases = [] } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "No code provided",
      });
    }

    console.log("🔄 Executing Java code...");
    const result = await javaService.executeJavaCode(code, testCases);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error,
        type: result.type,
        line: result.line,
      });
    }

    res.json({
      success: true,
      output: result.output,
      testResults: result.testResults,
      executionTime: result.executionTime,
    });
  } catch (error) {
    console.error("Java execution error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during Java execution",
      details: error.message,
    });
  }
});

// Validate Java syntax
router.post("/validate", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "No code provided",
      });
    }

    console.log("🔍 Validating Java syntax...");
    const result = await javaService.validateJavaSyntax(code);

    res.json({
      success: true,
      valid: result.valid,
      error: result.error,
      line: result.line,
    });
  } catch (error) {
    console.error("Java validation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during Java validation",
      details: error.message,
    });
  }
});

// Get Java template
router.get("/template", (req, res) => {
  const template = `public class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        Map<Integer, Integer> map = new HashMap<>();
        
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        
        return new int[0]; // No solution found
    }
}`;

  res.json({
    success: true,
    template,
  });
});

export default router;
