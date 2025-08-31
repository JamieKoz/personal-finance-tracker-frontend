export interface FileUploadProps {
  onUploadSuccess: () => void;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  compact?: boolean;
}