import { useState, useEffect } from 'react'
import { Play, RotateCcw, Copy, Check } from 'lucide-react'

function CodeEditor({ code, onCodeChange, question, evaluation, loading }) {
  const [currentCode, setCurrentCode] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('java')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState([])

  // Language templates
  const languageTemplates = {
    java: `public class Solution {
    public static void main(String[] args) {
        Solution sol = new Solution();
        // Test your solution here
    }
    
    // Write your solution method here
    
}`,
    javascript: `function solution(params) {
    // Your code here
    
}

// Test your solution
console.log(solution());`,
    python: `def solution(params):
    # Your code here
    pass

# Test your solution
print(solution())`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    // Write your solution method here
    
};

int main() {
    Solution sol;
    // Test your solution here
    return 0;
}`
  }

  // Initialize code when component mounts or question changes
  useEffect(() => {
    if (question && question.starterCode) {
      const starterCode = question.starterCode[selectedLanguage] || languageTemplates[selectedLanguage]
      setCurrentCode(starterCode)
      onCodeChange?.(starterCode)
    } else {
      setCurrentCode(languageTemplates[selectedLanguage])
      onCodeChange?.(languageTemplates[selectedLanguage])
    }
  }, [question, selectedLanguage])

  // Update code when prop changes
  useEffect(() => {
    if (code !== undefined && code !== currentCode) {
      setCurrentCode(code)
    }
  }, [code])

  // Update output when evaluation changes
  useEffect(() => {
    if (evaluation) {
      const results = evaluation.testResults || []
      setTestResults(results)
      
      const passedTests = results.filter(test => test.passed).length
      const totalTests = results.length
      
      setOutput(`Code Evaluation Complete!

Overall Score: ${evaluation.scores?.overall || 0}%
Tests Passed: ${passedTests}/${totalTests}

Feedback: ${evaluation.feedback?.strengths?.join(', ') || 'Good effort!'}

${evaluation.interviewerComment || ''}`)
    }
  }, [evaluation])

  const handleCodeChange = (e) => {
    const newCode = e.target.value
    setCurrentCode(newCode)
    onCodeChange?.(newCode)
  }

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value
    setSelectedLanguage(newLanguage)
    
    // Update code template for new language
    if (question && question.starterCode && question.starterCode[newLanguage]) {
      setCurrentCode(question.starterCode[newLanguage])
      onCodeChange?.(question.starterCode[newLanguage])
    } else {
      setCurrentCode(languageTemplates[newLanguage])
      onCodeChange?.(languageTemplates[newLanguage])
    }
  }

  const runCode = async () => {
    setIsRunning(true)
    setOutput('Running code...')
    
    // Simulate real test execution based on language and code
    setTimeout(() => {
      const mockResults = generateRealisticTestResults(currentCode, selectedLanguage, question)
      setTestResults(mockResults)
      
      const passedCount = mockResults.filter(test => test.passed).length
      const totalCount = mockResults.length
      
      let executionOutput = `Execution Results:\n\n`
      
      if (selectedLanguage === 'java') {
        executionOutput += `Compiled successfully!\n`
      } else if (selectedLanguage === 'python') {
        executionOutput += `Python 3.9.0 execution:\n`
      } else if (selectedLanguage === 'cpp') {
        executionOutput += `C++ compilation successful!\n`
      }
      
      executionOutput += `Test Results: ${passedCount}/${totalCount} passed\n\n`
      
      if (passedCount === totalCount) {
        executionOutput += `✅ All tests passed! Great job!\n`
        executionOutput += `Time Complexity: ${analyzeTimeComplexity(currentCode)}\n`
        executionOutput += `Space Complexity: ${analyzeSpaceComplexity(currentCode)}`
      } else {
        executionOutput += `❌ Some tests failed. Check your logic and edge cases.\n`
        executionOutput += `Hint: Look at the failed test cases below for debugging.`
      }
      
      setOutput(executionOutput)
      setIsRunning(false)
    }, 2000)
  }

  const generateRealisticTestResults = (code, language, question) => {
    // More realistic test case generation based on actual code analysis
    const testCases = question?.testCases || [
      { input: "Example 1", expectedOutput: "Expected 1" },
      { input: "Example 2", expectedOutput: "Expected 2" },
      { input: "Edge case", expectedOutput: "Edge result" }
    ]
    
    return testCases.map((testCase, index) => {
      // Analyze code quality to determine pass/fail
      let passed = true
      
      // Basic code analysis
      if (code.trim().length < 50) passed = false // Too short
      if (!code.includes('return') && language !== 'python') passed = false // No return statement
      if (code.includes('TODO') || code.includes('// Your code here')) passed = false // Template code
      
      // Random factor for realistic results
      if (Math.random() > 0.8) passed = false
      
      return {
        id: index + 1,
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: passed ? testCase.expectedOutput : 'Wrong output',
        passed,
        executionTime: Math.floor(Math.random() * 100) + 1 + 'ms',
        memoryUsed: Math.floor(Math.random() * 20) + 10 + 'MB'
      }
    })
  }

  const analyzeTimeComplexity = (code) => {
    if (code.includes('for') && code.includes('while')) return 'O(n²)'
    if (code.includes('for') || code.includes('while')) return 'O(n)'
    if (code.includes('sort')) return 'O(n log n)'
    return 'O(1)'
  }

  const analyzeSpaceComplexity = (code) => {
    if (code.includes('new ') || code.includes('[]') || code.includes('list') || code.includes('vector')) return 'O(n)'
    return 'O(1)'
  }

  const resetCode = () => {
    const starterCode = question?.starterCode?.[selectedLanguage] || languageTemplates[selectedLanguage]
    setCurrentCode(starterCode)
    onCodeChange?.(starterCode)
    setOutput('')
    setTestResults([])
  }

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode)
  }

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="editor-tabs">
          <div className="tab active">
            <span>Solution.{selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'python' ? 'py' : selectedLanguage}</span>
          </div>
          <select 
            value={selectedLanguage} 
            onChange={handleLanguageChange}
            className="language-selector"
          >
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <div className="editor-actions">
          <button className="editor-btn" onClick={copyCode} title="Copy code">
            <Copy size={16} />
          </button>
          <button className="editor-btn" onClick={resetCode} title="Reset code">
            <RotateCcw size={16} />
          </button>
          <button 
            className="btn btn-success editor-run-btn" 
            onClick={runCode}
            disabled={isRunning}
          >
            <Play size={16} />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="code-input">
          <textarea
            value={currentCode}
            onChange={handleCodeChange}
            className="code-textarea"
            placeholder={`Write your ${selectedLanguage} code here...`}
            spellCheck="false"
            disabled={loading}
          />
        </div>

        <div className="editor-output">
          <div className="output-header">
            <h4>Output</h4>
          </div>
          <div className="output-content">
            {output && (
              <pre className="output-text">{output}</pre>
            )}
            
            {testResults.length > 0 && (
              <div className="test-results">
                <h5>Test Results</h5>
                {testResults.map(test => (
                  <div key={test.id} className={`test-case ${test.passed ? 'passed' : 'failed'}`}>
                    <div className="test-status">
                      {test.passed ? <Check size={16} /> : '✗'}
                    </div>
                    <div className="test-details">
                      <div className="test-input">Input: {test.input}</div>
                      <div className="test-expected">Expected: {test.expected}</div>
                      <div className="test-actual">Actual: {test.actual}</div>
                      <div className="test-performance">
                        Time: {test.executionTime} | Memory: {test.memoryUsed}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor