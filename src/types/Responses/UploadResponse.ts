export interface UploadResponse {
	success: boolean;
	message: string;
	processedCount?: number;
	errors?: string[];
}
