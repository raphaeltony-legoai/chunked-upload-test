import React, { useState } from "react";
import axios from "axios";

let start_time = 0

const ResumableConcurrentFileUpload = () => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({}); // Track progress per file

  const uploadFileConcurrently = async (file) => {
    start_time = Date.now()
    const chunkSize = 100 *1024 * 1024; // 100MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    const identifier = `${file.name}-${file.size}-${file.lastModified}`;
    let uploadedChunks = JSON.parse(localStorage.getItem(identifier)) || [];
    const concurrentLimit = 5; // Limit the number of concurrent uploads
    const promises = []; // Array to hold current batch of uploads

    const uploadChunkWithRetry = async (currentChunk, retries = 3) => {
      const start = currentChunk * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("chunk_index", currentChunk);
      formData.append("total_chunks", totalChunks);
      formData.append("identifier", identifier);
      formData.append("filename", file.name);

      let attempt = 0;
      while (attempt < retries) {
        try {
          await axios.post("http://localhost:8000/upload-chunk/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          uploadedChunks.push(currentChunk);
          localStorage.setItem(identifier, JSON.stringify(uploadedChunks));
          setProgress((prev) => ({
            ...prev,
            [file.name]: ((uploadedChunks.length / totalChunks) * 100).toFixed(
              2
            ),
          }));
          return; // Exit on success
        } catch (error) {
          attempt++;
          console.error(
            `Retrying chunk ${currentChunk} of file ${file.name} (Attempt ${attempt}/${retries})`
          );
        }
      }
      throw new Error(`Failed to upload chunk ${currentChunk}`);
    };

    for (let currentChunk = 0; currentChunk < totalChunks; currentChunk++) {
      if (uploadedChunks.includes(currentChunk)) continue;

      // Push chunk uploads to the promises array
      promises.push(uploadChunkWithRetry(currentChunk));

      // When the limit is reached, wait for all current uploads to finish
      if (promises.length === concurrentLimit || currentChunk === totalChunks - 1) {
        try {
          await Promise.all(promises);
        } catch (error) {
          console.error("Error during concurrent uploads:", error);
          break; // Exit if there's an unresolvable error
        }
        // Clear promises for the next batch
        promises.length = 0;
      }
    }

    if (uploadedChunks.length === totalChunks) {
      let end_time = Date.now()
      console.log("COMPLETION TIME: ", (end_time-start_time)/1000, "s")
      localStorage.removeItem(identifier); // Cleanup after completion
      alert(`Upload complete for ${file.name}!`);
    }
  };

  const uploadFiles = () => {
    files.forEach((file) => uploadFileConcurrently(file));
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

export default ResumableConcurrentFileUpload;
