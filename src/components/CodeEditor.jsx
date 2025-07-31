import { useState } from 'react'
import { Play, RotateCcw, Copy, Check } from 'lucide-react'

function CodeEditor({ code, onCodeChange, question, evaluation, loading }) {
  const [code, setCode] = useState(`// Write your solution here
function solution(params) {
    // Your code here
    
}`)
  
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState([])

  // Update code when prop changes
  useEffect(() => {
    if (code !== undefined) {
      setCode(code)
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
    setCode(newCode)
    onCodeChange?.(newCode)
  }

  const runCode = async () => {
    setIsRunning(true)
    setOutput('Running code...')
    
    // Simulate code execution
    setTimeout(() => {
      const mockResults = [
        { id: 1, passed: true, input: 'Example input 1', expected: 'Expected 1', actual: 'Expected 1' },
        { id: 2, passed: true, input: 'Example input 2', expected: 'Expected 2', actual: 'Expected 2' },
        { id: 3, passed: false, input: 'Example input 3', expected: 'Expected 3', actual: 'Different output' }
      ]
      setTestResults([
        ...mockResults
      ])
      
      const passedCount = mockResults.filter(test => test.passed).length
      setOutput(`Test Results: ${passedCount}/${mockResults.length} passed

Time Complexity: O(n)
Space Complexity: O(1)

${passedCount === mockResults.length ? 'All tests passed! ✓' : 'Some tests failed. Check your logic.'}`)
      setIsRunning(false)
    }, 2000)
  }

  const resetCode = () => {
    const starterCode = question?.starterCode?.javascript || `// Write your solution here
function solution(params) {
    // Your code here
    
}`
    setCode(starterCode)
    onCodeChange?.(starterCode)
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
            onChange={handleCodeChange}
            className="code-textarea"
            placeholder="Write your code here..."
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