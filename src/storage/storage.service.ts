import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterFile } from 'src/common/types';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getRandomFileName } from 'src/common/utils/helpers';

@Injectable()
export class StorageService {
  private s3Client: S3Client;

  private readonly bucketName: string;
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;
    this.accountId = this.configService.get<string>('R2_ACCOUNT_ID')!;
    this.accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID')!;
    this.secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY')!;
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL')!;

    if (
      !this.bucketName ||
      !this.accountId ||
      !this.accessKeyId ||
      !this.secretAccessKey ||
      !this.publicUrl
    ) {
      throw new Error('Missing required environment variables for StorageService (Cloudflare R2)');
    }

    // Initialize R2 client (S3-compatible)
    this.s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' for region
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  async uploadFile(file: MulterFile, keyPrefix = 'uploads/inventory/') {
    try {
      const filename = `${keyPrefix}${getRandomFileName()}-${file.originalname}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      const response = await this.s3Client.send(command);
      return { response, filename };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('File upload failed');
    }
  }

  async removeFile(filename: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.s3Client.send(command);
      // R2 automatically handles cache invalidation, no manual step needed
    } catch (error) {
      console.error('Error removing file:', error);
      throw new Error('File removal failed');
    }
  }

  getImageUrl(filename: string) {
    return `${this.publicUrl}/${filename}`;
  }
}
