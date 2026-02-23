FROM oven/bun:1-debian

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Build tools (native module compilation)
    python3 \
    make \
    g++ \
    # Canvas dependencies
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # Sharp dependencies
    libvips-dev \
    libpng-dev \
    libwebp-dev \
    libheif-dev \
    # FFmpeg (media conversion)
    ffmpeg \
    # LibreOffice (PPTX conversion)
    libreoffice \
    # SSL certs (model downloads at runtime)
    ca-certificates \
    # Fonts for text rendering in charts/PDFs
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

RUN bun run build

CMD ["bun", "dist/main.js"]
