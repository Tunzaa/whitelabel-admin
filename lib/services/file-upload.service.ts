/**
 * File Upload Service
 * Handles uploading files and documents to the storage API
 */

export interface UploadResponse {
    filePath: string;
    fileName: string;
    fileUrl: string;
    fileCDNUrl: string;
    fileSize: number;
    mimeType: string;
    uploadDate: string;
    isPublic: boolean;
}

export const uploadFile = async (
    file: File,
    isPublic: boolean = true
): Promise<UploadResponse> => {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_DOCUMENT_UPLOAD_API_URL || '';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('public', isPublic.toString());

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Upload failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
};

export const isPdfFile = (fileName: string): boolean => {
    const ext = getFileExtension(fileName);
    return ext === 'pdf';
};

/**
 * Get file type from MIME type or file extension
 */
export const getDocumentType = (file: File | string | undefined | null): string => {
    // Handle undefined or null values
    if (!file) {
        return 'unknown';
    }
    
    // If a File object is provided
    if (typeof file !== 'string' && 'type' in file) {
        const mimeType = file.type;

        // Check MIME type first
        if (mimeType?.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'pdf';
        if (mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'doc';
        if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'spreadsheet';

        // Fall back to extension check if name is available
        if ('name' in file && file.name) {
            return getFileTypeFromName(file.name);
        }
        
        return 'unknown';
    }

    // If a filename/URL string is provided
    if (typeof file === 'string') {
        return getFileTypeFromName(file);
    }
    
    return 'unknown';
};

/**
 * Get file type from filename or URL
 */
export const getFileTypeFromName = (fileNameOrUrl: string): string => {
    const ext = getFileExtension(fileNameOrUrl);

    if (isImageFile(fileNameOrUrl)) return 'image';
    if (isPdfFile(fileNameOrUrl)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
    if (['ppt', 'pptx'].includes(ext)) return 'presentation';
    if (['txt', 'rtf'].includes(ext)) return 'text';
    if (['zip', 'rar', '7z'].includes(ext)) return 'archive';

    return 'other';
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File, allowedTypes?: string[], maxSizeMB: number = 5): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
        return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    // Check file type if restrictions provided
    if (allowedTypes && allowedTypes.length > 0) {
        const fileType = getDocumentType(file);
        if (!allowedTypes.includes(fileType)) {
            return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
        }
    }

    return null; // No error = valid
}; 