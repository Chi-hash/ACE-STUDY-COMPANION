// src/components/DebugPanel.jsx
import React, { useState } from "react";
import { debugAPI } from "../services/debug";
import { flashcardAPI } from "../services/api";
import "../styles/flashcard.css";

export function DebugPanel() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const runTests = async () => {
    setLoading(true);
    try {
      const connectionTest = await debugAPI.testConnection();
      const fileTest = await debugAPI.testFileUpload();
      const textTest = await debugAPI.testTextGeneration();
      const endpoints = await debugAPI.checkEndpoints();

      setResults({
        connectionTest,
        fileTest,
        textTest,
        endpoints,
      });
    } catch (error) {
      console.error("Debug tests failed:", error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const testFileUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const result = await flashcardAPI.generateFlashcardsFromFile(file);
      setResults({ fileUploadResult: result });
    } catch (error) {
      setResults({ fileUploadError: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flashcards-container space-y-6">
      <h2 className="flashcards-title">Backend Debug Panel</h2>

      <div className="card p-6 space-y-4">
        <h3 className="font-medium">Backend Connection Tests</h3>

        <div className="flex gap-2">
          <button
            onClick={runTests}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Running Tests..." : "Run All Tests"}
          </button>

          <button
            onClick={() => debugAPI.testConnection()}
            disabled={loading}
            className="btn btn-outline"
          >
            Test Connection
          </button>
        </div>

        <div className="card p-4">
          <h4 className="font-medium mb-2">File Upload Test</h4>
          <div className="space-y-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="input"
              accept=".pdf,.docx,.pptx,.xls,.xlsx,.txt"
            />
            <button
              onClick={testFileUpload}
              disabled={!file || loading}
              className="btn btn-secondary"
            >
              Test File Upload
            </button>
          </div>
        </div>
      </div>

      {results && (
        <div className="card p-6">
          <h3 className="font-medium mb-4">Test Results</h3>

          {results.error ? (
            <div className="error-banner">
              <p>Error: {results.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.connectionTest && (
                <div
                  className={`p-3 rounded ${
                    results.connectionTest.success
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <h4 className="font-medium">Connection Test</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(results.connectionTest, null, 2)}
                  </pre>
                </div>
              )}

              {results.fileTest && (
                <div
                  className={`p-3 rounded ${
                    results.fileTest.success
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <h4 className="font-medium">File Upload Test</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(results.fileTest, null, 2)}
                  </pre>
                </div>
              )}

              {results.textTest && (
                <div
                  className={`p-3 rounded ${
                    results.textTest.success
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <h4 className="font-medium">Text Generation Test</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(results.textTest, null, 2)}
                  </pre>
                </div>
              )}

              {results.endpoints && (
                <div className="p-3 rounded bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-medium">Endpoints Status</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(results.endpoints, null, 2)}
                  </pre>
                </div>
              )}

              {results.fileUploadResult && (
                <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20">
                  <h4 className="font-medium">Manual File Upload Result</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(results.fileUploadResult, null, 2)}
                  </pre>
                </div>
              )}

              {results.fileUploadError && (
                <div className="p-3 rounded bg-red-50 dark:bg-red-900/20">
                  <h4 className="font-medium">Manual File Upload Error</h4>
                  <p>{results.fileUploadError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-medium mb-4">Troubleshooting Steps</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Check if backend server is running at:
            https://student-success-backend.onrender.com
          </li>
          <li>Verify your Firebase authentication token is valid</li>
          <li>Check browser console for CORS errors</li>
          <li>Try uploading a smaller file (under 1MB)</li>
          <li>Try different file formats (start with .txt)</li>
          <li>Check backend logs for specific errors</li>
        </ol>
      </div>
    </div>
  );
}
