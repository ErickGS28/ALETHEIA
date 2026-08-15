import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiskStorageService } from './disk-storage.service';
import { R2StorageService } from './r2-storage.service';
import { STORAGE_SERVICE, type StorageService } from './storage.interface';

const logger = new Logger('StorageModule');

@Module({
  imports: [ConfigModule],
  providers: [
    DiskStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, disk: DiskStorageService): StorageService => {
        const r2Vars = {
          CLOUDFLARE_R2_ACCESS_KEY: config.get<string>('CLOUDFLARE_R2_ACCESS_KEY'),
          CLOUDFLARE_R2_SECRET_KEY: config.get<string>('CLOUDFLARE_R2_SECRET_KEY'),
          CLOUDFLARE_R2_BUCKET_NAME: config.get<string>('CLOUDFLARE_R2_BUCKET_NAME'),
          CLOUDFLARE_R2_ENDPOINT: config.get<string>('CLOUDFLARE_R2_ENDPOINT'),
        };
        const { CLOUDFLARE_R2_ACCESS_KEY: accessKey, CLOUDFLARE_R2_SECRET_KEY: secretKey } = r2Vars;
        const { CLOUDFLARE_R2_BUCKET_NAME: bucket, CLOUDFLARE_R2_ENDPOINT: endpoint } = r2Vars;
        if (accessKey && secretKey && bucket && endpoint) {
          logger.log(`Storage backend: Cloudflare R2 (bucket ${bucket})`);
          return new R2StorageService({ accessKey, secretKey, bucket, endpoint });
        }

        const missing = Object.entries(r2Vars)
          .filter(([, value]) => !value)
          .map(([key]) => key);
        if (missing.length > 0 && missing.length < 4) {
          logger.warn(
            `Cloudflare R2 config is incomplete — missing: ${missing.join(', ')}. This looks like a misconfiguration.`,
          );
        }
        logger.warn(
          `Storage backend: local disk (${disk.uploadsDir}) — uploads will NOT survive a container redeploy`,
        );
        return disk;
      },
      inject: [ConfigService, DiskStorageService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
