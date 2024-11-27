from fastapi import FastAPI, UploadFile, File, Form, Request, BackgroundTasks
import uvicorn
import aiofiles
import os
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
import time



app = FastAPI()

start = 0
end = 0
# Define allowed origins
origins = [
    "http://localhost:3000",  # React app running on localhost
    "http://127.0.0.1:3000",
    # Add other origins as needed
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Specify allowed origins
    allow_credentials=True,  # Allow credentials (cookies, authorization headers)
    allow_methods=["*"],     # Allow all HTTP methods
    allow_headers=["*"],     # Allow all headers
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    print("Request Received")
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    print("Process Time :", process_time)
    return response

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


async def cleanup(final_file_path, total_chunks, file_dir):
    async with aiofiles.open(final_file_path, "wb") as final_file:
        for i in range(total_chunks):
            chunk_file_path = file_dir / f"{i}.part"
            async with aiofiles.open(chunk_file_path, "rb") as chunk_file:
                await final_file.write(await chunk_file.read())
            os.remove(chunk_file_path)  # Delete chunk after merging
    os.rmdir(file_dir)  # Remove the chunk directory
    

@app.post("/upload-chunk/")
async def upload_chunk(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    identifier: str = Form(...),
    filename: str = Form(...)  # Receive original filename
):
    # Directory for storing chunks
    file_dir = UPLOAD_DIR / identifier
    file_dir.mkdir(exist_ok=True)

    # Save the chunk
    chunk_path = file_dir / f"{chunk_index}.part"
    try:
        async with aiofiles.open(chunk_path, "wb") as chunk_file:
            content = await file.read()
            await chunk_file.write(content)
    except Exception as e:
        return {"error": f"Failed to process chunk {chunk_index} of file {filename}: {str(e)}"}

    # Check if all chunks are uploaded
    uploaded_chunks = list(file_dir.glob("*.part"))
    if len(uploaded_chunks) == total_chunks:
        # Combine chunks into the final file
        final_file_path = UPLOAD_DIR / filename
        background_tasks.add_task(cleanup, final_file_path, total_chunks, file_dir)
        

        return {"message": f"File upload complete for {filename}"}

    return {"message": f"Chunk {chunk_index} of {filename} uploaded successfully"}


if __name__ == '__main__':
        uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=4)
