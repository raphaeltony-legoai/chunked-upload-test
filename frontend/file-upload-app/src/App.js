import React, { useState } from "react";
import axios from "axios";

let start = 0
const ResumableMultiFileUpload = () => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({}); // Track progress per file

  const uploadFile = async (file) => {
    start = Date.now();
    const chunkSize = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    const identifier = `${file.name}-${file.size}-${file.lastModified}`;
    let uploadedChunks = JSON.parse(localStorage.getItem(identifier)) || [];

    for (let currentChunk = 0; currentChunk < totalChunks; currentChunk++) {
      if (uploadedChunks.includes(currentChunk)) continue;

      const start = currentChunk * chunkSize;
      const end = Math.min(file.size, start + chunkSize);

      const chunk = file.slice(start, end); // Directly slice the file

      const formData = new FormData();
      formData.append("file", chunk); // Send the chunk
      formData.append("chunk_index", currentChunk);
      formData.append("total_chunks", totalChunks);
      formData.append("identifier", identifier);
      formData.append("filename", file.name);

      try {
        await axios.post("http://localhost:8000/upload-chunk/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        uploadedChunks.push(currentChunk);
        localStorage.setItem(identifier, JSON.stringify(uploadedChunks));
        setProgress((prev) => ({
          ...prev,
          [file.name]: ((uploadedChunks.length / totalChunks) * 100).toFixed(2),
        }));
      } catch (error) {
        console.error(`Error uploading chunk ${currentChunk} of file ${file.name}:`, error);
        break;
      }
    }

    if (uploadedChunks.length === totalChunks) {
      const end = Date.now();
      console.log(`Upload Time: ${(end - start)/1000} s`);
      localStorage.removeItem(identifier); // Cleanup after completion
      alert(`Upload complete for ${file.name}!`);
    }
  };

  const uploadFiles = () => {
    files.forEach((file) => uploadFile(file));
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={(e) => setFiles([...e.target.files])}
      />
      <button onClick={uploadFiles}>Upload</button>
      <div>
        {files.map((file) => (
          <div key={file.name}>
            {file.name}: {progress[file.name] || 0}%
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResumableMultiFileUpload;
