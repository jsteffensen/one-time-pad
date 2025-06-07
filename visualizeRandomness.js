const fs = require('fs');
const path = require('path');

const inputFile = '5mb.dat'; // Input binary file
const outputFile = 'output.bmp';

const inputPath = path.join(__dirname, inputFile);
const outputPath = path.join(__dirname, outputFile);

// Read the binary data
const data = fs.readFileSync(inputPath);
const fileSize = data.length;

// Determine the largest square dimensions
const dimension = Math.floor(Math.sqrt(fileSize));
const imageSize = dimension * dimension;
const pixelData = data.slice(0, imageSize);

// BMP files require row padding to 4-byte boundaries
function addPadding(row, width) {
    const rowSize = width;
    const paddingSize = (4 - (rowSize % 4)) % 4;
    if (paddingSize === 0) return row;
    const padding = Buffer.alloc(paddingSize, 0);
    return Buffer.concat([row, padding]);
}

// Prepare pixel array with row padding (bottom-up)
const rows = [];
for (let y = 0; y < dimension; y++) {
    const row = pixelData.slice(y * dimension, (y + 1) * dimension);
    rows.unshift(addPadding(row, dimension));
}
const bmpPixelArray = Buffer.concat(rows);

// BMP header construction
const fileHeaderSize = 14;
const dibHeaderSize = 40;
const headerSize = fileHeaderSize + dibHeaderSize;
const paddedRowSize = Math.ceil(dimension / 4) * 4;
const imageByteSize = paddedRowSize * dimension;
const fileByteSize = headerSize + imageByteSize;

const fileHeader = Buffer.alloc(fileHeaderSize);
fileHeader.write('BM'); // Bitmap signature
fileHeader.writeUInt32LE(fileByteSize, 2); // File size
fileHeader.writeUInt32LE(0, 6); // Reserved
fileHeader.writeUInt32LE(headerSize, 10); // Pixel array offset

const dibHeader = Buffer.alloc(dibHeaderSize);
dibHeader.writeUInt32LE(dibHeaderSize, 0); // DIB header size
dibHeader.writeInt32LE(dimension, 4); // Image width
dibHeader.writeInt32LE(dimension, 8); // Image height (positive = bottom-up)
dibHeader.writeUInt16LE(1, 12); // Planes
dibHeader.writeUInt16LE(8, 14); // Bits per pixel
dibHeader.writeUInt32LE(0, 16); // Compression (none)
dibHeader.writeUInt32LE(imageByteSize, 20); // Image size
dibHeader.writeInt32LE(2835, 24); // X pixels per meter
dibHeader.writeInt32LE(2835, 28); // Y pixels per meter
dibHeader.writeUInt32LE(256, 32); // Colors in palette
dibHeader.writeUInt32LE(0, 36); // Important colors

// Create grayscale palette (256 entries)
const palette = Buffer.alloc(256 * 4);
for (let i = 0; i < 256; i++) {
    palette[i * 4 + 0] = i; // Blue
    palette[i * 4 + 1] = i; // Green
    palette[i * 4 + 2] = i; // Red
    palette[i * 4 + 3] = 0; // Reserved
}

// Combine all parts
const bmpBuffer = Buffer.concat([fileHeader, dibHeader, palette, bmpPixelArray]);
fs.writeFileSync(outputPath, bmpBuffer);

console.log(`✅ BMP image written to: ${outputFile} (${dimension}x${dimension})`);