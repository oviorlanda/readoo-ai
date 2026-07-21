# Production Dockerfile for Readoo AI Backend
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=5000 \
    HOST=0.0.0.0

# Install system dependencies (ffmpeg is required for Whisper STT audio processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create non-root user for security hardening
RUN useradd -m -u 1000 appuser

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Ensure data directory exists and set owner to appuser
RUN mkdir -p /app/data/uploads /app/data/vector_store && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose server port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start production Waitress WSGI server
CMD ["python", "main.py"]
