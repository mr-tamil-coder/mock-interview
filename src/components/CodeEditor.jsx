import { useState } from 'react'
import { Play, RotateCcw, Copy, Check } from 'lucide-react'

function CodeEditor() {
  const [code, setCode] = useState(`// Write your solution here
function twoSum(nums, target) {
    // Your code here
    
}`)
  
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState([])

  const runCode = async () => {
    setIsRunning(true)
    setOutput('Running code...')
    
    // Simulate code execution
    setTimeout(() => {
      setOutput('Test Case 1: PASSED ✓\nTest Case 2: PASSED ✓\nTest Case 3: FAILED ✗\n\nTime Complexity: O(n)\nSpace Complexity: O(n)')
      setTestResults([
        { id: 1, passed: true, input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[0,1]' },
        { id: 2, passed: true, input: '[3,2,4], 6', expected: '[1,2]', actual: '[1,2]' },
        { id: 3, passed: false, input: '[3,3], 6', expected: '[0,1]', actual: 'undefined' }
      ])
      setIsRunning(false)
    }, 2000)
  }

  const resetCode = () => {
    setCode(`// Write your solution here
function twoSum(nums, target) {
    // Your code here
    
}`)
    setOutput('')
    setTestResults([])
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="editor-tabs">
          <div className="tab active">
            <span>Solution.js</span>
          </div>
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
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="code-textarea"
            placeholder="Write your code here..."
            spellCheck="false"
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