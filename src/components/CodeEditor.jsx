import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Copy, Check, AlertCircle, Zap, Clock, Target } from 'lucide-react';

function CodeEditor({ code, onCodeChange, question, evaluation, loading }) {
  const [currentCode, setCurrentCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [compilationError, setCompilationError] = useState(null);
  const [syntaxError, setSyntaxError] = useState(null);
  const [score, setScore] = useState(null);
  const [detailedFeedback, setDetailedFeedback] = useState(null);
  const editorRef = useRef(null);

  // Empty Java class template
  const javaTemplate = `public class Solution {
    // Write your solution here
}`;

  // Initialize code when component mounts or question changes
  // Handle code changes from Monaco Editor
  const handleEditorChange = (value) => {
    setCurrentCode(value);
    onCodeChange?.(value);
  };

  useEffect(() => {
    if (question && question.starterCode) {
      const starterCode = question.starterCode.java || javaTemplate;
      setCurrentCode(starterCode);
      onCodeChange?.(starterCode);
    } else {
      setCurrentCode(javaTemplate);
      onCodeChange?.(javaTemplate);
    }
  }, [question]);

  // Update code when prop changes
  useEffect(() => {
    if (code !== undefined && code !== currentCode) {
      setCurrentCode(code);
    }
  }, [code]);

  // Update output when evaluation changes
  useEffect(() => {
    if (evaluation) {
      const results = evaluation.testResults || [];
      setTestResults(results);

      const passedTests = results.filter((test) => test.passed).length;
      const totalTests = results.length;
      const overallScore = evaluation.scores?.overall || 0;

      setScore({
        overall: overallScore,
        correctness: evaluation.scores?.correctness || 0,
        efficiency: evaluation.scores?.efficiency || 0,
        codeQuality: evaluation.scores?.codeQuality || 0,
        problemSolving: evaluation.scores?.problemSolving || 0,
      });

      setDetailedFeedback({
        strengths: evaluation.feedback?.strengths || [],
        improvements: evaluation.feedback?.improvements || [],
        complexity: evaluation.complexityAnalysis || {},
        comment: evaluation.interviewerComment || '',
      });

      setOutput(`Code Evaluation Complete!

🎯 Overall Score: ${overallScore}%
✅ Tests Passed: ${passedTests}/${totalTests}

📊 Score Breakdown:
• Correctness: ${evaluation.scores?.correctness || 0}%
• Efficiency: ${evaluation.scores?.efficiency || 0}%
• Code Quality: ${evaluation.scores?.codeQuality || 0}%
• Problem Solving: ${evaluation.scores?.problemSolving || 0}%

💡 Feedback: ${evaluation.feedback?.strengths?.join(', ') || 'Good effort!'}

${evaluation.interviewerComment || ''}`);
    }
  }, [evaluation]);

  const handleCodeChange = (newCode) => {
    setCurrentCode(newCode);
    onCodeChange?.(newCode);

    // Clear previous errors
    setCompilationError(null);
    setSyntaxError(null);
  };

  const formatCode = () => {
    // Basic Java code formatting
    let formatted = currentCode;

    // Fix indentation
    const lines = formatted.split('\n');
    const formattedLines = lines.map((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '') return '';

      // Calculate proper indentation
      let indentLevel = 0;
      if (trimmed.includes('{')) indentLevel++;
      if (trimmed.includes('}')) indentLevel--;

      // Apply indentation
      const indent = '    '.repeat(Math.max(0, indentLevel));
      return indent + trimmed;
    });

    formatted = formattedLines.join('\n');
    setCurrentCode(formatted);
    onCodeChange?.(formatted);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('🔄 Compiling and running Java code...');
    setCompilationError(null);
    setSyntaxError(null);

    try {
      // Call the real Java execution service
      const response = await fetch('http://localhost:3000/api/java/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: currentCode,
          testCases: question?.testCases || [],
        }),
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      // Try to parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const responseText = await response.text();
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!result.success) {
        if (result.type === 'compilation') {
          setCompilationError({
            message: result.error,
            line: result.line,
          });
          setOutput(`❌ Compilation Error (Line ${result.line || 'Unknown'}):
${result.error}`);
        } else if (result.type === 'timeout') {
          setOutput(`⏱️ Time Limit Exceeded (2 seconds)
Your code took too long to execute. Try optimizing your solution.`);
        } else if (result.type === 'memory') {
          setOutput(`💾 Memory Limit Exceeded (256MB)
Your code used too much memory. Try optimizing your solution.`);
        } else if (result.type === 'security') {
          setOutput(`⚠️ Security Error:
${result.error}
Only standard Java collections and utilities are allowed.`);
        } else if (result.type === 'runtime') {
          setOutput(`⚠️ Runtime Error:
${result.error}

💡 Tips:
• Check for null pointer exceptions
• Verify array bounds
• Ensure proper return statements`);
        } else {
          setOutput(`❌ System Error:
${result.error}`);
        }
      } else {
        setTestResults(result.testResults || []);

        const passedCount = result.testResults?.filter((test) => test.passed).length || 0;
        const totalCount = result.testResults?.length || 0;

        let executionOutput = `✅ Java compilation successful!
⚡ Execution completed in ${result.executionTime || 0}ms

📋 Test Results: ${passedCount}/${totalCount} passed

${result.output || 'Code executed successfully!'}`;

        if (result.testResults && result.testResults.length > 0) {
          executionOutput += '\n\n📊 Detailed Test Results:';
          result.testResults.forEach((test, index) => {
            executionOutput += `\n\nTest ${index + 1}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`;
            executionOutput += `\nInput: ${test.input}`;
            executionOutput += `\nExpected: ${test.expected}`;
            executionOutput += `\nActual: ${test.actual}`;
            if (test.error) {
              executionOutput += `\nError: ${test.error}`;
            }
          });
        }

        setOutput(executionOutput);
      }
    } catch (error) {
      setOutput(`❌ Execution failed: ${error.message}`);
      console.error('Java execution error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const checkJavaSyntax = (code) => {
    // Basic Java syntax validation
    const errors = [];

    // Check for basic Java structure
    if (!code.includes('public class')) {
      errors.push('Missing public class declaration');
    }

    if (!code.includes('public') && !code.includes('private') && !code.includes('protected')) {
      errors.push('No method declarations found');
    }

    // Check for common syntax errors
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (
        trimmed.includes('{') &&
        !trimmed.includes('}') &&
        !trimmed.includes('class') &&
        !trimmed.includes('if') &&
        !trimmed.includes('for') &&
        !trimmed.includes('while')
      ) {
        // Check if next few lines have matching brace
        let braceCount = 0;
        for (let i = index; i < Math.min(index + 10, lines.length); i++) {
          if (lines[i].includes('{')) braceCount++;
          if (lines[i].includes('}')) braceCount--;
          if (braceCount === 0) break;
        }
        if (braceCount > 0) {
          errors.push(`Unmatched brace at line ${index + 1}`);
        }
      }
    });

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('\n'),
        line: 1,
      };
    }

    return { valid: true };
  };

  const analyzeCodeQuality = (code) => {
    let score = 0;
    const feedback = [];

    // Basic structure check
    if (code.length > 100) score += 20;
    else feedback.push('Code seems too short for a complete solution');

    // Java-specific checks
    if (code.includes('public') && code.includes('class')) score += 20;
    if (code.includes('return')) score += 20;
    if (code.includes('HashMap') || code.includes('Map')) {
      score += 20;
      feedback.push('Good use of HashMap for optimization');
    }
    if (code.includes('for') || code.includes('while')) {
      score += 10;
      feedback.push('Proper loop implementation');
    }
    if (code.includes('// ') || code.includes('/* ')) {
      score += 10;
      feedback.push('Good code documentation');
    }

    return { score: Math.min(score, 100), feedback };
  };

  const resetCode = () => {
    const starterCode = question?.starterCode?.java || javaTemplate;
    setCurrentCode(starterCode);
    onCodeChange?.(starterCode);
    setOutput('');
    setTestResults([]);
    setCompilationError(null);
    setSyntaxError(null);
    setScore(null);
    setDetailedFeedback(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="editor-tabs">
          <div className="tab active">
            <span>Solution.java</span>
          </div>
          <div className="java-badge">
            <Zap size={14} />
            Java Only
          </div>
        </div>
        <div className="editor-actions">
          <button className="editor-btn" onClick={formatCode} title="Format code">
            <Target size={16} />
          </button>
          <button className="editor-btn" onClick={copyCode} title="Copy code">
            <Copy size={16} />
          </button>
          <button className="editor-btn" onClick={resetCode} title="Reset code">
            <RotateCcw size={16} />
          </button>
          <button className="btn btn-success editor-run-btn" onClick={runCode} disabled={isRunning}>
            <Play size={16} />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="code-input">
          <Editor
            height="500px"
            defaultLanguage="java"
            theme="vs-dark"
            value={currentCode}
            onChange={handleCodeChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              formatOnType: true,
              formatOnPaste: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            loading="Loading editor..."
            disabled={loading}
          />

          {/* Error highlighting */}
          {compilationError && (
            <div className="error-overlay">
              <div
                className="error-marker"
                style={{ top: `${(compilationError.line - 1) * 24}px` }}
              >
                <AlertCircle size={16} />
              </div>
            </div>
          )}
        </div>

        <div className="editor-output">
          <div className="output-header">
            <h4>Output & Results</h4>
          </div>
          <div className="output-content">
            {output && <pre className="output-text">{output}</pre>}

            {/* Score Display */}
            {score && (
              <div className="score-display">
                <h5>📊 Detailed Score Analysis</h5>
                <div className="score-breakdown">
                  <div className="score-item">
                    <div className="score-label">Overall Score</div>
                    <div className="score-value overall">{score.overall}%</div>
                  </div>
                  <div className="score-item">
                    <div className="score-label">Correctness</div>
                    <div className="score-value">{score.correctness}%</div>
                  </div>
                  <div className="score-item">
                    <div className="score-label">Efficiency</div>
                    <div className="score-value">{score.efficiency}%</div>
                  </div>
                  <div className="score-item">
                    <div className="score-label">Code Quality</div>
                    <div className="score-value">{score.codeQuality}%</div>
                  </div>
                  <div className="score-item">
                    <div className="score-label">Problem Solving</div>
                    <div className="score-value">{score.problemSolving}%</div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Feedback */}
            {detailedFeedback && (
              <div className="feedback-section">
                <h5>💡 Detailed Feedback</h5>
                {detailedFeedback.strengths.length > 0 && (
                  <div className="feedback-group">
                    <h6>✅ Strengths:</h6>
                    <ul>
                      {detailedFeedback.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailedFeedback.improvements.length > 0 && (
                  <div className="feedback-group">
                    <h6>🔧 Areas for Improvement:</h6>
                    <ul>
                      {detailedFeedback.improvements.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailedFeedback.complexity && (
                  <div className="feedback-group">
                    <h6>⚡ Complexity Analysis:</h6>
                    <p>Time: {detailedFeedback.complexity.timeComplexity || 'O(n)'}</p>
                    <p>Space: {detailedFeedback.complexity.spaceComplexity || 'O(1)'}</p>
                  </div>
                )}
                {detailedFeedback.comment && (
                  <div className="feedback-group">
                    <h6>💬 Interviewer Comment:</h6>
                    <p>{detailedFeedback.comment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="test-results">
                <h5>🧪 Test Results</h5>
                {testResults.map((test) => (
                  <div key={test.id} className={`test-case ${test.passed ? 'passed' : 'failed'}`}>
                    <div className="test-status">
                      {test.passed ? <Check size={16} /> : <AlertCircle size={16} />}
                    </div>
                    <div className="test-details">
                      <div className="test-input">Input: {test.input}</div>
                      <div className="test-expected">Expected: {test.expected}</div>
                      <div className="test-actual">Actual: {test.actual}</div>
                      <div className="test-performance">
                        <Clock size={12} /> {test.executionTime} | Memory: {test.memoryUsed}
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
  );
}

export default CodeEditor;
