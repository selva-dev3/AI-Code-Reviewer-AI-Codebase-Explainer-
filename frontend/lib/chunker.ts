export interface CodeChunk {
  file_path: string;
  start_line: number;
  end_line: number;
  content: string;
}

/**
 * Splits a file into logical chunks of roughly 400 tokens (approx 1600 characters / 35-40 lines of code)
 */
export function chunkCodeFile(filePath: string, content: string): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];
  
  let currentChunkLines: string[] = [];
  let chunkStartLine = 1;
  
  // Roughly 40 lines per chunk
  const TARGET_CHUNK_LINES = 40;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentChunkLines.push(line);

    const isLastLine = i === lines.length - 1;
    
    // Check if we reached target size, or if it is a good boundary (like closing braces at end of line)
    const isBoundary = line.trim() === '}' || line.trim() === '};' || line.trim().startsWith('export ');
    const hasEnoughLines = currentChunkLines.length >= TARGET_CHUNK_LINES;

    if (isLastLine || (hasEnoughLines && isBoundary) || currentChunkLines.length >= TARGET_CHUNK_LINES * 1.5) {
      chunks.push({
        file_path: filePath,
        start_line: chunkStartLine,
        end_line: i + 1,
        content: currentChunkLines.join('\n'),
      });
      
      chunkStartLine = i + 2;
      currentChunkLines = [];
    }
  }

  return chunks;
}
