import React, { useState, useRef } from "react";

interface ImageUploadProps {
  onUploadSuccess: () => void;
}

interface UploadState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUploadSuccess }) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isLoading: false,
    error: null,
    success: false,
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setUploadState((prev) => ({ ...prev, error: null }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFiles || selectedFiles.length === 0) {
      setUploadState((prev) => ({
        ...prev,
        error: "Please select at least one image file",
      }));
      return;
    }

    setUploadState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const formData = new FormData();

      // Append all selected files to FormData
      Array.from(selectedFiles).forEach((file) => {
        formData.append(`images`, file);
      });

      const response = await fetch(
        import.meta.env.VITE_API_IMAGES_URL ||
          "http://localhost:5000/api/images",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        setUploadState((prev) => ({
          ...prev,
          isLoading: false,
          success: true,
        }));

        // Wait a moment to show success state, then proceed
        setTimeout(() => {
          onUploadSuccess();
        }, 1500);
      } else {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setUploadState((prev) => ({ ...prev, error: null }));
    }
  };

  const clearFiles = () => {
    setSelectedFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadState((prev) => ({ ...prev, error: null }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            Upload Images
          </h1>
          <p className="text-gray-400 text-lg">
            Select multiple images to prepare for video processing
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                selectedFiles && selectedFiles.length > 0
                  ? "border-green-500 bg-green-500/10"
                  : "border-gray-600 hover:border-blue-500 hover:bg-blue-500/10"
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-lg font-medium text-white mb-2">
                    {selectedFiles && selectedFiles.length > 0
                      ? `${selectedFiles.length} file(s) selected`
                      : "Drop images here or click to browse"}
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports JPG, PNG, GIF, and other image formats
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-300">
                    Selected Files:
                  </h3>
                  <button
                    type="button"
                    onClick={clearFiles}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-300 truncate">
                          {file.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadState.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-400">{uploadState.error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadState.success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-green-400">
                    Images uploaded successfully! Starting black & white
                    processing...
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                uploadState.isLoading ||
                !selectedFiles ||
                selectedFiles.length === 0
              }
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none"
            >
              {uploadState.isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                "Upload Images & Continue"
              )}
            </button>
          </form>
        </div>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
