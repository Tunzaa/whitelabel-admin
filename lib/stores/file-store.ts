import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DocumentWithMeta } from '@/components/ui/document-upload';
import { UploadResponse, uploadFile } from '@/lib/services/file-upload.service';

export interface FileWithUpload extends DocumentWithMeta {
    uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
    progress?: number;
    uploadResponse?: UploadResponse;
    error?: string;
}

interface FileState {
    // Files keyed by form identifier to support multiple forms
    files: Record<string, FileWithUpload[]>;
    uploadingFiles: Record<string, boolean>;
    // Track active forms to clean up when component unmounts
    activeForms: Set<string>;

    // Actions
    addFile: (formId: string, file: FileWithUpload) => void;
    updateFile: (formId: string, fileId: string, updates: Partial<FileWithUpload>) => void;
    removeFile: (formId: string, fileId: string) => void;
    setFiles: (formId: string, files: FileWithUpload[]) => void;
    clearFiles: (formId?: string) => void;

    // Form lifecycle management
    registerForm: (formId: string) => void;
    unregisterForm: (formId: string) => void;

    // Upload functions
    uploadFile: (formId: string, fileId: string, isPublic?: boolean) => Promise<FileWithUpload>;
    retryUpload: (formId: string, fileId: string) => Promise<void>;
}

export const useFileStore = create<FileState>()(
    persist(
        (set, get) => ({
            files: {},
            uploadingFiles: {},
            activeForms: new Set<string>(),

            addFile: (formId, file) => {
                // Register form if not already registered
                get().registerForm(formId);

                set((state) => {
                    const formFiles = state.files[formId] || [];

                    // Check if file already exists
                    const existingIndex = formFiles.findIndex(
                        existingFile => existingFile.file_id === file.file_id
                    );

                    if (existingIndex >= 0) {
                        // Update existing file
                        const updatedFiles = [...formFiles];
                        updatedFiles[existingIndex] = { ...updatedFiles[existingIndex], ...file };

                        return {
                            files: {
                                ...state.files,
                                [formId]: updatedFiles
                            }
                        };
                    } else {
                        // Add new file
                        return {
                            files: {
                                ...state.files,
                                [formId]: [...formFiles, file]
                            }
                        };
                    }
                });
            },

            updateFile: (formId, fileId, updates) => {
                set((state) => {
                    const formFiles = state.files[formId] || [];
                    const updatedFiles = formFiles.map(file =>
                        file.file_id === fileId ? { ...file, ...updates } : file
                    );

                    return {
                        files: { ...state.files, [formId]: updatedFiles }
                    };
                });
            },

            removeFile: (formId, fileId) => {
                set((state) => {
                    const formFiles = state.files[formId] || [];
                    const fileToRemove = formFiles.find(file => file.file_id === fileId);
                    const updatedFiles = formFiles.filter(file => file.file_id !== fileId);

                    // Get the file name for the uploading status key
                    const fileName = fileToRemove?.file_name || "";

                    return {
                        files: { ...state.files, [formId]: updatedFiles },
                        uploadingFiles: {
                            ...state.uploadingFiles,
                            [`${formId}-${fileName}`]: false
                        }
                    };
                });
            },

            setFiles: (formId, files) => {
                // Register form if not already registered
                get().registerForm(formId);

                set((state) => ({
                    files: { ...state.files, [formId]: files }
                }));
            },

            clearFiles: (formId) => {
                if (formId) {
                    set((state) => ({
                        files: { ...state.files, [formId]: [] },
                        uploadingFiles: Object.entries(state.uploadingFiles)
                            .filter(([key]) => !key.startsWith(`${formId}-`))
                            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
                    }));
                } else {
                    set({ files: {}, uploadingFiles: {} });
                }
            },

            registerForm: (formId) => {
                set((state) => {
                    const newActiveForms = new Set(state.activeForms);
                    newActiveForms.add(formId);
                    return { activeForms: newActiveForms };
                });
            },

            unregisterForm: (formId) => {
                set((state) => {
                    // Clean up files for this form
                    const updatedFiles = { ...state.files };
                    delete updatedFiles[formId];

                    // Clean up uploading state
                    const updatedUploading = { ...state.uploadingFiles };
                    Object.keys(updatedUploading).forEach(key => {
                        if (key.startsWith(`${formId}-`)) {
                            delete updatedUploading[key];
                        }
                    });

                    // Remove from active forms
                    const newActiveForms = new Set(state.activeForms);
                    newActiveForms.delete(formId);

                    return {
                        files: updatedFiles,
                        uploadingFiles: updatedUploading,
                        activeForms: newActiveForms
                    };
                });
            },

            uploadFile: async (formId, fileId, isPublic = true) => {
                // Find the file by ID
                const formFiles = get().files[formId] || [];
                const file = formFiles.find(f => f.file_id === fileId);

                // Skip if file not found, no file object, or already uploading
                if (!file || !file.file || get().uploadingFiles[`${formId}-${file.file_name}`]) {
                    return file || {} as FileWithUpload;
                }

                // Mark as uploading
                set((state) => ({
                    uploadingFiles: {
                        ...state.uploadingFiles,
                        [`${formId}-${file.file_name}`]: true
                    },
                    files: {
                        ...state.files,
                        [formId]: (state.files[formId] || []).map(d =>
                            d.file_id === fileId
                                ? { ...d, uploadStatus: 'uploading', progress: 0, error: undefined }
                                : d
                        )
                    }
                }));

                try {
                    // Upload the file
                    const response = await uploadFile(file.file, isPublic);

                    // Update file with upload response
                    const updatedFile = {
                        ...file,
                        document_url: response.fileCDNUrl,
                        file_url: response.fileCDNUrl,
                        file_size: response.fileSize,
                        mime_type: response.mimeType,
                        uploadStatus: 'success',
                        progress: 100,
                        uploadResponse: response,
                        error: undefined
                    } as FileWithUpload;

                    // Update in store
                    set((state) => ({
                        files: {
                            ...state.files,
                            [formId]: (state.files[formId] || []).map(d =>
                                d.file_id === fileId ? updatedFile : d
                            )
                        }
                    }));

                    return updatedFile;
                } catch (error) {
                    // Update file with error status
                    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                    set((state) => ({
                        files: {
                            ...state.files,
                            [formId]: (state.files[formId] || []).map(d =>
                                d.file_id === fileId
                                    ? { ...d, uploadStatus: 'error', error: errorMessage }
                                    : d
                            )
                        }
                    }));

                    return {
                        ...file,
                        uploadStatus: 'error',
                        error: errorMessage
                    } as FileWithUpload;
                } finally {
                    // Clear uploading flag
                    set((state) => ({
                        uploadingFiles: {
                            ...state.uploadingFiles,
                            [`${formId}-${file.file_name}`]: false
                        }
                    }));
                }
            },

            retryUpload: async (formId, fileId) => {
                const formFiles = get().files[formId] || [];
                const file = formFiles.find(f => f.file_id === fileId);
                if (file && file.file) {
                    await get().uploadFile(formId, fileId);
                }
            }
        }),
        {
            name: 'file-storage',
            partialize: (state) => ({
                // Only persist files that have been successfully uploaded
                files: Object.entries(state.files).reduce((acc, [formId, files]) => {
                    // Only include files from active forms that have completed uploads
                    if (state.activeForms.has(formId)) {
                        acc[formId] = files.filter(file => file.uploadStatus === 'success');
                    }
                    return acc;
                }, {} as Record<string, FileWithUpload[]>)
            })
        }
    )
);