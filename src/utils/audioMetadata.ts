import * as musicMetadata from 'music-metadata-browser';

export interface AudioMetadata {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  genre?: string;
  coverUrl?: string;
}

// Convert blob to base64 data URL for persistent storage
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function extractMetadata(file: File): Promise<AudioMetadata> {
  try {
    console.log(`Parsing metadata for: ${file.name}`);
    const metadata = await musicMetadata.parseBlob(file);
    console.log('Metadata parsed:', metadata.common);

    let coverUrl: string | undefined;

    // Extract cover art if available and convert to base64
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      console.log(`Found ${metadata.common.picture.length} picture(s)`);
      const picture = metadata.common.picture[0];
      console.log(`Picture format: ${picture.format}, size: ${picture.data.length} bytes`);
      const blob = new Blob([picture.data], { type: picture.format });
      coverUrl = await blobToDataUrl(blob);
      console.log(`Cover URL created, length: ${coverUrl.length}`);
    } else {
      console.log('No pictures found in metadata');
    }

    // Get title from metadata or filename
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    let title = metadata.common.title || fileName;
    let artist = metadata.common.artist || 'אמן לא ידוע';

    // If no metadata, try to parse from filename (Artist - Title format)
    if (!metadata.common.title && fileName.includes(' - ')) {
      const parts = fileName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    return {
      title,
      artist,
      album: metadata.common.album,
      duration: metadata.format.duration || 0,
      genre: metadata.common.genre?.[0],
      coverUrl,
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);

    // Fallback to filename parsing
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    let title = fileName;
    let artist = 'אמן לא ידוע';

    if (fileName.includes(' - ')) {
      const parts = fileName.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    return {
      title,
      artist,
      duration: 0,
    };
  }
}


export async function extractMetadataFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<AudioMetadata> {
  try {
    console.log(`Parsing metadata from buffer for: ${fileName}`);
    const uint8Array = new Uint8Array(buffer);
    const metadata = await musicMetadata.parseBuffer(uint8Array);
    console.log('Metadata parsed:', metadata.common);

    let coverUrl: string | undefined;

    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const blob = new Blob([picture.data], { type: picture.format });
      coverUrl = await blobToDataUrl(blob);
    }

    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    let title = metadata.common.title || fileNameWithoutExt;
    let artist = metadata.common.artist || 'אמן לא ידוע';

    if (!metadata.common.title && fileNameWithoutExt.includes(' - ')) {
      const parts = fileNameWithoutExt.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    return {
      title,
      artist,
      album: metadata.common.album,
      duration: metadata.format.duration || 0,
      genre: metadata.common.genre?.[0],
      coverUrl,
    };
  } catch (error) {
    console.error('Error extracting metadata from buffer:', error);

    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    let title = fileNameWithoutExt;
    let artist = 'אמן לא ידוע';

    if (fileNameWithoutExt.includes(' - ')) {
      const parts = fileNameWithoutExt.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    return {
      title,
      artist,
      duration: 0,
    };
  }
}
